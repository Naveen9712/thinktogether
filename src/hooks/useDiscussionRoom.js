import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  end as endDiscussion,
  getMessages,
  getStatus,
  interrupt as interruptDiscussion,
  nextTurn,
  pause as pauseDiscussion,
  resume as resumeDiscussion,
  sendUserMessage,
} from '../lib/api.js';
import { getToken } from '../lib/sessions.js';
import { getAuthToken } from '../lib/auth.js';
import { DRIVING_STATUSES, friendlyError } from '../lib/format.js';
import { lastStableId, mergeMessages } from '../lib/messages.js';
import { useToast } from '../components/Toast.jsx';

const POLL_IDLE_MS = 1500;
const POLL_GENERATING_MS = 1000;
const POLL_WAITING_MS = 4000; // paused or waiting for the human: nothing changes on its own
const POLL_HIDDEN_MS = 15000; // tab in the background: keep the server load tiny
const POLL_ERROR_MS = 3000;
const TURN_GAP_MS = 800;
const CONFLICT_WAIT_MS = 2000;
const INTERRUPT_WAIT_MS = 15000;
const MAX_INVALID_STATE_RETRIES = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isDriving = (status) => DRIVING_STATUSES.includes(status);
const isTerminal = (status) => status === 'completed' || status === 'ended';
const isCanceled = (e) => e && (e.code === 'ERR_CANCELED' || e.name === 'CanceledError');
const pageHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/**
 * Owns every piece of engine logic for a discussion room: polling, message merging,
 * the single turn-driver loop, the local clock and all user actions.
 */
export default function useDiscussionRoom(id) {
  const toast = useToast();
  const toastRef = useRef(toast);
  const doneToastRef = useRef(null); // id of the "discussion is complete" toast, so Resume can clear it
  toastRef.current = toast;

  // Guests need this discussion's secret token; signed-in users are checked by the server (their account).
  const hasToken = useMemo(() => Boolean(getToken(id) || getAuthToken()), [id]);

  const [discussion, setDiscussion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [fatal, setFatal] = useState(hasToken ? null : 'no_access');
  const [offline, setOffline] = useState(false);
  const [turnError, setTurnError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [sending, setSending] = useState(false);
  const [, setTick] = useState(0);
  // Polling stops once a discussion has finished; "Resume conversation" bumps this to start it again.
  const [pollEpoch, setPollEpoch] = useState(0);

  const mountedRef = useRef(true);
  const discussionRef = useRef(null);
  const messagesRef = useRef([]);
  const anchorRef = useRef({ at: 0 });
  const versionRef = useRef(0);
  const driverRunningRef = useRef(false);
  const driverCtlRef = useRef(null);
  const busyRef = useRef(null);
  const sendingRef = useRef(false);
  const lastErrorKeyRef = useRef('');
  const wakeRef = useRef(null);
  const autoPausedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (driverCtlRef.current) driverCtlRef.current.abort();
    };
  }, []);

  /** Stores a discussion snapshot. `bump` marks it as newer than any poll already in flight. */
  const applyDiscussion = useCallback((next, bump) => {
    if (!next) return;
    const prev = discussionRef.current;
    if (bump) versionRef.current += 1;
    discussionRef.current = next;
    anchorRef.current = { at: performance.now() };
    setDiscussion(next);
    if (prev && prev.status !== 'completed' && next.status === 'completed') {
      doneToastRef.current = toastRef.current.success('The discussion is complete. Your summary is ready.');
    }
  }, []);

  /** Merges messages by id, keeps them ordered, and never lets a stale "generating" copy win. */
  const mergeIn = useCallback((incoming) => {
    const next = mergeMessages(messagesRef.current, incoming);
    if (next === messagesRef.current) return;
    messagesRef.current = next;
    setMessages(next);
  }, []);

  // ---------------------------------------------------------------- polling loop
  useEffect(() => {
    if (!hasToken) return undefined;
    let cancelled = false;
    let timer = null;
    let inFlight = false;
    const controller = new AbortController();

    const run = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      if (timer) clearTimeout(timer);
      timer = null;
      const startVersion = versionRef.current;
      let delay = POLL_IDLE_MS;
      let stop = false;
      try {
        const data = await getMessages(id, lastStableId(messagesRef.current), { signal: controller.signal });
        if (cancelled) return;
        mergeIn(data.messages);
        if (versionRef.current === startVersion || !discussionRef.current) {
          applyDiscussion(data.discussion, false);
        }
        setOffline(false);
        lastErrorKeyRef.current = '';
        const d = discussionRef.current;
        const streaming = messagesRef.current.some((m) => m.generation_status === 'generating');
        if (d && isTerminal(d.status) && !d.generating && !streaming) {
          stop = true;
        } else if (d && d.generating) {
          delay = POLL_GENERATING_MS;
        } else if (d && (d.status === 'paused' || d.status === 'waiting_user')) {
          delay = POLL_WAITING_MS;
        }
        if (pageHidden()) delay = POLL_HIDDEN_MS;
      } catch (e) {
        inFlight = false;
        if (cancelled || isCanceled(e)) return;
        if (e.status === 404 || e.code === 'not_found') {
          setFatal('not_found');
          return;
        }
        if (e.code === 'no_access') {
          setFatal('no_access');
          return;
        }
        if (!e.status || e.status >= 500) setOffline(true);
        const key = `${e.code || ''}:${e.message}`;
        if (lastErrorKeyRef.current !== key) {
          lastErrorKeyRef.current = key;
          toastRef.current.error(friendlyError(e));
        }
        delay = POLL_ERROR_MS;
      }
      inFlight = false;
      if (!cancelled && !stop) timer = setTimeout(run, delay);
    };

    // Lets the page poll immediately when the user comes back to the tab.
    wakeRef.current = () => {
      if (!cancelled && timer) run();
    };

    run();
    return () => {
      cancelled = true;
      wakeRef.current = null;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [id, hasToken, applyDiscussion, mergeIn, pollEpoch]);

  // ---------------------------------------------------------------- leaving the page
  // Phones stop running a page in the background, so no new turns would be asked for while the server clock
  // keeps running. Pause when the page is hidden; on return, poll at once and tell the user how to continue.
  useEffect(() => {
    if (!hasToken) return undefined;
    const onVisibility = () => {
      if (pageHidden()) {
        const d = discussionRef.current;
        if (d && d.status === 'active' && !busyRef.current && !sendingRef.current) {
          autoPausedRef.current = true;
          pauseDiscussion(id)
            .then((res) => {
              if (res && res.discussion && mountedRef.current) applyDiscussion(res.discussion, true);
            })
            .catch(() => {
              autoPausedRef.current = false;
            });
        }
        return;
      }
      if (wakeRef.current) wakeRef.current();
      if (autoPausedRef.current) {
        autoPausedRef.current = false;
        toastRef.current.info('We paused the discussion while you were away. Press Resume to continue.');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [id, hasToken, applyDiscussion]);

  // ---------------------------------------------------------------- turn driver
  const applyTurnResult = useCallback(
    (res) => {
      if (res.discussion) applyDiscussion(res.discussion, true);
      if (res.message) mergeIn([res.message]);
      if (res.result === 'concluding_started') {
        toastRef.current.info('Time is up. The thinkers are sharing their closing thoughts.');
      }
    },
    [applyDiscussion, mergeIn]
  );

  const runDriver = useCallback(async () => {
    if (driverRunningRef.current) return;
    driverRunningRef.current = true;
    const controller = new AbortController();
    driverCtlRef.current = controller;
    let invalidStates = 0;
    try {
      while (mountedRef.current) {
        const d = discussionRef.current;
        if (!d || !isDriving(d.status) || d.generating) break;

        let res;
        try {
          res = await nextTurn(id, { signal: controller.signal });
        } catch (e) {
          if (!mountedRef.current || isCanceled(e)) break;
          if (e.code === 'turn_in_progress' || e.code === 'generation_in_progress') {
            await sleep(CONFLICT_WAIT_MS);
            continue;
          }
          if (e.status === 404 || e.code === 'not_found') {
            setFatal('not_found');
            break;
          }
          if (e.code === 'invalid_state' && invalidStates < MAX_INVALID_STATE_RETRIES) {
            invalidStates += 1;
            await sleep(CONFLICT_WAIT_MS);
            continue;
          }
          setTurnError({
            message: friendlyError(e),
            code: e.code || 'error',
            retryable: e.details?.retryable !== false,
          });
          break;
        }

        if (!mountedRef.current) break;
        invalidStates = 0;
        setTurnError(null);
        applyTurnResult(res);
        await sleep(res.result === 'noop' ? CONFLICT_WAIT_MS : TURN_GAP_MS);
      }
    } finally {
      driverRunningRef.current = false;
      if (driverCtlRef.current === controller) driverCtlRef.current = null;
    }
  }, [id, applyTurnResult]);

  const status = discussion ? discussion.status : null;
  const generating = discussion ? discussion.generating : false;

  useEffect(() => {
    if (status && isDriving(status) && !generating && !turnError) runDriver();
  }, [status, generating, turnError, runDriver]);

  const retry = useCallback(() => {
    setTurnError(null);
  }, []);

  // ---------------------------------------------------------------- local clock
  const ticking = Boolean(status && isDriving(status));
  useEffect(() => {
    if (!ticking) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [ticking]);

  let clock = null;
  if (discussion) {
    const delta = ticking ? Math.max(0, Math.floor((performance.now() - anchorRef.current.at) / 1000)) : 0;
    clock = {
      elapsed: discussion.elapsed_seconds + delta,
      remaining: Math.max(0, discussion.remaining_seconds - delta),
    };
  }

  // ---------------------------------------------------------------- actions
  const act = useCallback(
    async (name, call, successText) => {
      if (busyRef.current || sendingRef.current) return false;
      busyRef.current = name;
      setBusy(name);
      try {
        const res = await call();
        if (res && res.discussion) applyDiscussion(res.discussion, true);
        if (successText) toastRef.current.info(successText);
        return true;
      } catch (e) {
        if (e.status === 404 || e.code === 'not_found') setFatal('not_found');
        else toastRef.current.error(friendlyError(e));
        return false;
      } finally {
        busyRef.current = null;
        setBusy(null);
      }
    },
    [applyDiscussion]
  );

  const pause = useCallback(() => act('pause', () => pauseDiscussion(id), 'Discussion paused.'), [act, id]);

  const resume = useCallback(() => {
    setTurnError(null);
    autoPausedRef.current = false;
    return act('resume', () => resumeDiscussion(id), 'Discussion resumed.');
  }, [act, id]);

  const interrupt = useCallback(
    () => act('interrupt', () => interruptDiscussion(id), 'You have the floor. The AIs are waiting for you.'),
    [act, id]
  );

  const end = useCallback(() => act('end', () => endDiscussion(id), 'Discussion ended.'), [act, id]);

  /** Called by the Resume dialog after continue.php succeeded: show the new state and start polling again. */
  const resumed = useCallback(
    (next) => {
      applyDiscussion(next, true);
      setTurnError(null);
      setPollEpoch((n) => n + 1);
      // The "discussion is complete" note no longer applies once it is running again.
      if (doneToastRef.current) toastRef.current.dismiss(doneToastRef.current);
      doneToastRef.current = null;
      toastRef.current.success('Conversation resumed. The AIs remember everything said so far.');
    },
    [applyDiscussion]
  );

  const sendMessage = useCallback(
    async (text) => {
      const message = (text || '').trim();
      if (!message || sendingRef.current || busyRef.current) return false;
      sendingRef.current = true;
      setSending(true);
      try {
        const current = discussionRef.current;
        if (current && current.status === 'active' && current.generating) {
          try {
            const r = await interruptDiscussion(id);
            applyDiscussion(r.discussion, true);
          } catch (e) {
            // The turn may have finished on its own just now; anything else is a real failure.
            if (e.code !== 'not_interruptible' && e.code !== 'invalid_state') throw e;
          }
          const deadline = Date.now() + INTERRUPT_WAIT_MS;
          while (discussionRef.current && discussionRef.current.generating) {
            if (Date.now() > deadline || !mountedRef.current) {
              throw new Error('The AI is still finishing its turn. Please try sending again in a moment.');
            }
            await sleep(500);
            const s = await getStatus(id);
            applyDiscussion(s.discussion, true);
          }
        }
        const res = await sendUserMessage(id, message);
        if (res.message) mergeIn([res.message]);
        applyDiscussion(res.discussion, true);
        setTurnError(null);
        return true;
      } catch (e) {
        if (e.status === 404 || e.code === 'not_found') setFatal('not_found');
        else toastRef.current.error(friendlyError(e));
        return false;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [id, applyDiscussion, mergeIn]
  );

  return {
    discussion,
    messages,
    clock,
    fatal,
    offline,
    turnError,
    busy,
    sending,
    retry,
    pause,
    resume,
    interrupt,
    end,
    resumed,
    sendMessage,
  };
}
