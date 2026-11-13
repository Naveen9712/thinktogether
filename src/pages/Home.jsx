import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import ModePicker from '../components/ModePicker.jsx';
import ParticipantSetup from '../components/ParticipantSetup.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { IconArrowRight, IconSpinner } from '../components/Icons.jsx';
import { createDiscussion, getOptions } from '../lib/api.js';
import { saveSession } from '../lib/sessions.js';
import { fillSeats } from '../lib/participants.js';
import { DEPTHS, friendlyError } from '../lib/format.js';
import { radioKeyDown } from '../lib/radio.js';
import { useAuth } from '../hooks/useAuth.jsx';

const SUGGESTIONS = [
  'Is human consciousness more than brain activity?',
  'Could artificial intelligence ever become conscious?',
  'Does free will actually exist?',
  'Is our universe a simulation?',
  'What is the nature of reality?',
  'Can science explain spirituality?',
  'Will humans eventually become immortal?',
  'What makes human intelligence unique?',
];

const PRESETS = [5, 10, 15, 20, 30];
const TOPIC_MIN = 3;
const TOPIC_MAX = 500;
const CONTEXT_MAX = 2000;

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-danger">{message}</p>;
}

function Label({ htmlFor, children, hint }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">
        {children}
      </label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

// The mode and participants chosen last time are remembered on this device (a convenience only).
const SETUP_KEY = 'tt_setup';
function readSetup() {
  try {
    const v = JSON.parse(localStorage.getItem(SETUP_KEY) || 'null');
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}
function writeSetup(v) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(v));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

function SetupSkeleton() {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading options">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function GuestNote() {
  return (
    <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted">
        <span className="font-semibold text-fg">You are using ThinkTogether as a guest.</span> Guest discussions are saved only on this device and are never reviewed by anyone. Log in to keep them in your account and create your own AI personalities.
      </p>
      <div className="flex shrink-0 gap-2">
        <Link to="/login" className="rounded-xl border border-line px-3.5 py-2 font-semibold text-fg transition hover:bg-surface-2">
          Log in
        </Link>
        <Link to="/signup" className="rounded-xl bg-alpha px-3.5 py-2 font-semibold text-bg transition hover:opacity-90">
          Sign up
        </Link>
      </div>
    </div>
  );
}

const PRESET_VALUES = [...PRESETS, 'custom'];
const DEPTH_VALUES = DEPTHS.map((d) => d.value);

export default function Home() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [preset, setPreset] = useState(10);
  const [customMinutes, setCustomMinutes] = useState('');
  const [depth, setDepth] = useState('deep');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState('');
  const [mode, setMode] = useState(() => (readSetup() || {}).mode || 'collaborative');
  const [seats, setSeats] = useState([]);

  // Modes, personalities (incl. the user's own) and limits come from the server, so the form always matches it.
  const loadOptions = useCallback(async (signal) => {
    setOptionsError('');
    try {
      const o = await getOptions({ signal });
      setOptions(o);
      const saved = readSetup() || {};
      const count = Math.min(o.max_participants, Math.max(o.min_participants, Number(saved.count) || o.min_participants));
      setSeats((prev) => fillSeats(o, count, prev.length ? prev : saved.seats || []));
      setMode((m) => (o.modes.some((x) => x.key === m) ? m : o.default_mode));
    } catch (e) {
      if (e.code === 'ERR_CANCELED') return;
      setOptionsError(friendlyError(e));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadOptions(controller.signal);
    return () => controller.abort();
  }, [loadOptions, isLoggedIn]);

  useEffect(() => {
    if (options && seats.length) writeSetup({ mode, count: seats.length, seats });
  }, [options, mode, seats]);

  const changeCount = (n) => {
    setSeats((prev) => fillSeats(options, n, prev));
    clearError('participants');
  };
  const pickSeat = (index, ref) => {
    setSeats((prev) => prev.map((r, i) => (i === index ? ref : r)));
    clearError('participants');
  };

  const isCustom = preset === 'custom';
  const minutes = isCustom ? Number(customMinutes) : preset;
  const topicLength = topic.trim().length;
  const topicValid = topicLength >= TOPIC_MIN && topicLength <= TOPIC_MAX;
  const contextValid = context.length <= CONTEXT_MAX;
  const minutesValid = Number.isInteger(minutes) && minutes >= 1 && minutes <= 120;
  const valid = topicValid && contextValid && minutesValid;

  const clearError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});
    try {
      const payload = {
        topic: topic.trim(),
        duration_minutes: minutes,
        discussion_depth: depth,
      };
      if (context.trim()) payload.additional_context = context.trim();
      if (options) {
        payload.discussion_mode = mode;
        payload.participants = seats;
      }
      const res = await createDiscussion(payload);
      // Guests keep the secret token on this device; account discussions need no token.
      if (!isLoggedIn) {
        saveSession({
          id: res.id,
          token: res.token,
          topic: payload.topic,
          created_at: (res.discussion && res.discussion.start_time) || new Date().toISOString(),
        });
      }
      navigate(`/room/${res.id}`);
    } catch (err) {
      const fields = err.details && err.details.fields;
      if (err.code === 'validation_error' && fields && typeof fields === 'object') {
        setFieldErrors(fields);
        const known = ['topic', 'additional_context', 'duration_minutes', 'discussion_depth', 'discussion_mode', 'participants'];
        const unknown = Object.entries(fields).filter(([k]) => !known.includes(k));
        setFormError(unknown.length ? unknown.map(([, v]) => v).join(' ') : 'Please fix the highlighted fields.');
      } else {
        setFormError(friendlyError(err));
      }
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-fg placeholder:text-muted transition focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20';

  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pt-16">
        <section className="mx-auto max-w-2xl text-center animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-alpha" />
            <span className="h-1.5 w-1.5 rounded-full bg-beta" />
            <span className="h-1.5 w-1.5 rounded-full bg-gamma" />
            Live AI discussion, moderated
          </div>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-fg sm:text-5xl">
            Watch AI minds think out loud.{' '}
            <span className="bg-gradient-to-r from-alpha to-beta bg-clip-text text-transparent">Then step in.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Pick a question, choose how many AIs take part and how each one thinks, and let them discuss it while Gamma keeps it fair. Interrupt, pause or add your own voice whenever you like.
          </p>
        </section>

        {!isLoggedIn && <GuestNote />}
        {isLoggedIn && (
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted">
            Hi <span className="font-semibold text-fg">{user.name}</span>, your discussions are saved to your account. They are private: other users and guests can never see them.
          </p>
        )}

        <form onSubmit={submit} className="mx-auto mt-10 max-w-2xl space-y-7 rounded-3xl border border-line bg-surface/60 p-5 sm:p-7" noValidate>
          <div>
            <Label htmlFor="topic" hint={`${topicLength}/${TOPIC_MAX}`}>
              What should they discuss?
            </Label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                clearError('topic');
              }}
              maxLength={TOPIC_MAX}
              rows={3}
              placeholder="Ask a big question or describe a topic…"
              className={`${inputCls} resize-y`}
              aria-invalid={Boolean(fieldErrors.topic)}
            />
            {topicLength > 0 && topicLength < TOPIC_MIN && <p className="mt-1.5 text-xs text-muted">Use at least {TOPIC_MIN} characters.</p>}
            <FieldError message={fieldErrors.topic} />
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setTopic(s);
                    clearError('topic');
                  }}
                  className={`rounded-full border px-3 py-1.5 text-left text-xs transition ${
                    topic === s ? 'border-alpha/60 bg-alpha/10 text-fg' : 'border-line bg-surface text-muted hover:border-alpha/40 hover:text-fg'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="context" hint={`Optional · ${context.length}/${CONTEXT_MAX}`}>
              Additional context
            </Label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                clearError('additional_context');
              }}
              rows={3}
              placeholder="Anything that should shape the conversation: your view, a definition, an angle to avoid…"
              className={`${inputCls} resize-y`}
              aria-invalid={Boolean(fieldErrors.additional_context) || !contextValid}
            />
            {!contextValid && <p className="mt-1.5 text-xs font-medium text-danger">Context must be {CONTEXT_MAX} characters or fewer.</p>}
            <FieldError message={fieldErrors.additional_context} />
          </div>

          <div>
            <Label htmlFor="mode-group">Discussion mode</Label>
            {!options && !optionsError && <SetupSkeleton />}
            {options && (
              <div id="mode-group">
                <ModePicker
                  modes={options.modes}
                  value={mode}
                  onChange={(m) => {
                    setMode(m);
                    clearError('discussion_mode');
                  }}
                  error={fieldErrors.discussion_mode}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="participants">AI participants</Label>
            {!options && !optionsError && <SetupSkeleton />}
            {optionsError && (
              <div className="rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-3 text-sm text-fg" role="alert">
                Could not load the personalities: {optionsError}{' '}
                <button type="button" onClick={() => loadOptions()} className="font-semibold text-alpha hover:underline">
                  Try again
                </button>
                <span className="mt-1 block text-xs text-muted">You can still start: Alpha (Analytical) and Beta (Philosophical) will discuss, with Gamma moderating.</span>
              </div>
            )}
            {options && (
              <div id="participants">
                <ParticipantSetup
                  options={options}
                  seats={seats}
                  onCountChange={changeCount}
                  onPick={pickSeat}
                  mode={mode}
                  isLoggedIn={isLoggedIn}
                  error={fieldErrors.participants}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="duration-group" hint="Minutes">
              Duration
            </Label>
            <div
              id="duration-group"
              role="radiogroup"
              aria-label="Discussion duration"
              className="flex flex-wrap gap-2"
              onKeyDown={(e) => {
                if (e.target.tagName === 'INPUT') return;
                radioKeyDown(e, PRESET_VALUES, preset, (v) => {
                  setPreset(v);
                  clearError('duration_minutes');
                });
              }}
            >
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={preset === m}
                  tabIndex={preset === m ? 0 : -1}
                  onClick={() => {
                    setPreset(m);
                    clearError('duration_minutes');
                  }}
                  className={`h-10 min-w-[3.5rem] rounded-xl border px-4 text-sm font-semibold transition ${
                    preset === m ? 'border-alpha bg-alpha/15 text-alpha' : 'border-line bg-surface text-muted hover:text-fg'
                  }`}
                >
                  {m}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={isCustom}
                tabIndex={isCustom ? 0 : -1}
                onClick={() => setPreset('custom')}
                className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${
                  isCustom ? 'border-alpha bg-alpha/15 text-alpha' : 'border-line bg-surface text-muted hover:text-fg'
                }`}
              >
                Custom
              </button>
              {isCustom && (
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  value={customMinutes}
                  onChange={(e) => {
                    setCustomMinutes(e.target.value);
                    clearError('duration_minutes');
                  }}
                  placeholder="1-120"
                  aria-label="Custom duration in minutes"
                  autoFocus
                  className="h-10 w-24 rounded-xl border border-line bg-surface px-3 text-sm text-fg focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20"
                />
              )}
            </div>
            {isCustom && customMinutes !== '' && !minutesValid && <p className="mt-1.5 text-xs font-medium text-danger">Enter a whole number from 1 to 120.</p>}
            <FieldError message={fieldErrors.duration_minutes} />
          </div>

          <div>
            <Label htmlFor="depth-group">Depth of discussion</Label>
            <div
              id="depth-group"
              role="radiogroup"
              aria-label="Discussion depth"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
              onKeyDown={(e) =>
                radioKeyDown(e, DEPTH_VALUES, depth, (v) => {
                  setDepth(v);
                  clearError('discussion_depth');
                })
              }
            >
              {DEPTHS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={depth === d.value}
                  tabIndex={depth === d.value ? 0 : -1}
                  onClick={() => {
                    setDepth(d.value);
                    clearError('discussion_depth');
                  }}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    depth === d.value ? 'border-alpha bg-alpha/10' : 'border-line bg-surface hover:border-alpha/40'
                  }`}
                >
                  <p className={`text-sm font-semibold ${depth === d.value ? 'text-alpha' : 'text-fg'}`}>{d.title}</p>
                  <p className="mt-1 text-xs leading-snug text-muted">{d.description}</p>
                </button>
              ))}
            </div>
            <FieldError message={fieldErrors.discussion_depth} />
          </div>

          {formError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-fg" role="alert">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={!valid || submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-alpha to-beta text-[15px] font-semibold text-bg shadow-lg shadow-alpha/10 transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <IconSpinner size={18} />
                Starting…
              </>
            ) : (
              <>
                Start discussion
                <IconArrowRight size={18} />
              </>
            )}
          </button>
        </form>

      </main>
    </div>
  );
}
