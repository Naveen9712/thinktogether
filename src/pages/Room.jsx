import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useDiscussionRoom from '../hooks/useDiscussionRoom.js';
import RoomHeader from '../components/RoomHeader.jsx';
import ParticipantsBar from '../components/ParticipantsBar.jsx';
import MessageCard from '../components/MessageCard.jsx';
import Controls from '../components/Controls.jsx';
import ErrorState from '../components/ErrorState.jsx';
import SpeakingIndicator from '../components/SpeakingIndicator.jsx';
import Avatar from '../components/Avatar.jsx';
import ResumeDialog from '../components/ResumeDialog.jsx';
import { MessageSkeletons } from '../components/Skeleton.jsx';
import { IconAlert, IconArrowDown, IconPlay, IconWifiOff } from '../components/Icons.jsx';
import { metaFor, participantMap, participantsKey } from '../lib/participants.js';
import { useAuth } from '../hooks/useAuth.jsx';

const NEAR_BOTTOM_PX = 120;

function distanceFromBottom() {
  const doc = document.documentElement;
  return doc.scrollHeight - (window.scrollY + window.innerHeight);
}

function EmptyConversation({ discussion, metaMap }) {
  const next = metaFor(metaMap, discussion.next_speaker);
  const running = discussion.status === 'active' || discussion.status === 'concluding';
  return (
    <div className="flex animate-fade-in flex-col items-center px-4 py-16 text-center">
      <Avatar meta={next} size={56} speaking={running} />
      <h2 className="mt-5 text-base font-semibold text-fg">
        {running ? (next.moderator ? `${next.name} is opening the discussion` : `${next.name} is preparing the opening thoughts`) : 'No messages yet'}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        {running
          ? 'The first response usually takes a few seconds. You can step in at any time.'
          : 'Messages will appear here once the discussion continues.'}
      </p>
      {running && <SpeakingIndicator variant="dots" colorClass={next.style.text} className="mt-4" />}
    </div>
  );
}

function FinishedBanner({ discussion, id, onResume }) {
  const completed = discussion.status === 'completed';
  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-fg">{completed ? 'This discussion is complete.' : 'You ended this discussion.'}</p>
      <p className="mt-0.5 text-sm text-muted">
        {completed
          ? 'Everyone shared their closing thoughts and the summary is ready. You can also continue the conversation.'
          : 'No closing thoughts were generated, but you can still create a summary or continue the conversation.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {discussion.can_resume && (
          <button type="button" onClick={onResume} className="flex items-center gap-1.5 rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
            <IconPlay size={15} />
            Resume conversation
          </button>
        )}
        <Link
          to={`/summary/${id}`}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${discussion.can_resume ? 'border border-line text-fg hover:bg-surface-2' : 'bg-alpha text-bg hover:opacity-90'}`}
        >
          View summary
        </Link>
        <Link to="/" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-2">
          New discussion
        </Link>
      </div>
      {!discussion.can_resume && discussion.resume_count > 0 && (
        <p className="mt-2 text-xs text-muted">This discussion has been resumed the maximum number of times.</p>
      )}
    </div>
  );
}

/** Screen-reader announcement of each finished message (the visual list itself is not a live region). */
function LiveAnnouncer({ messages, metaMap }) {
  const last = [...messages].reverse().find((m) => m.generation_status !== 'generating' && m.speaker !== 'user' && m.speaker !== 'system');
  const name = last ? metaFor(metaMap, last.speaker).name : '';
  const text = last ? `${name}: ${last.message.slice(0, 600)}` : '';
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}

function NoAccess({ id, isLoggedIn }) {
  return (
    <ErrorState
      tone="muted"
      title="You don't have access to this discussion"
      message={
        isLoggedIn
          ? 'It belongs to another account, or it no longer exists.'
          : 'It was started on another device or belongs to an account. If it is yours, log in to open it.'
      }
    >
      {!isLoggedIn && (
        <Link to={`/login?next=${encodeURIComponent(`/room/${id}`)}`} className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
          Log in
        </Link>
      )}
      <Link to="/" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-2">
        Back to home
      </Link>
    </ErrorState>
  );
}

function RoomView({ id }) {
  const room = useDiscussionRoom(id);
  const { isLoggedIn } = useAuth();
  const { discussion, messages, clock, fatal, offline, turnError } = room;
  const navigate = useNavigate();
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);

  // Names, personalities and colours of everyone in the room. Rebuilt only when the participants change.
  const participants = discussion ? discussion.participants : null;
  const pKey = participantsKey(discussion);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `participants` only changes when pKey does
  const metaMap = useMemo(() => participantMap({ participants }), [pKey]);

  useEffect(() => {
    const onScroll = () => {
      const near = distanceFromBottom() < NEAR_BOTTOM_PX;
      atBottomRef.current = near;
      setShowJump(!near);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const last = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastLength = last ? last.message.length : 0;
  const lastStatus = last ? last.generation_status : '';

  useEffect(() => {
    if (atBottomRef.current) window.scrollTo(0, document.documentElement.scrollHeight);
  }, [messages.length, lastLength, lastStatus, turnError, offline]);

  const topic = discussion ? discussion.topic : '';
  useEffect(() => {
    document.title = topic ? `${topic} | ThinkTogether` : 'ThinkTogether';
    return () => {
      document.title = 'ThinkTogether';
    };
  }, [topic]);

  const jumpToLatest = useCallback(() => {
    atBottomRef.current = true;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }, []);

  if (fatal) return <NoAccess id={id} isLoggedIn={isLoggedIn} />;

  const streaming = Boolean(last && last.generation_status === 'generating' && last.message.length > 0);
  const finished = discussion && (discussion.status === 'completed' || discussion.status === 'ended');
  const driving = discussion && (discussion.status === 'active' || discussion.status === 'concluding');

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-safe backdrop-blur">
        <div className="mx-auto max-w-3xl px-4">
          <RoomHeader discussion={discussion} clock={clock} />
          {discussion && (
            <div className="pb-2.5">
              <ParticipantsBar discussion={discussion} streamingHasText={streaming} />
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        <LiveAnnouncer messages={messages} metaMap={metaMap} />
        {!discussion && <MessageSkeletons count={3} />}
        {discussion && messages.length === 0 && <EmptyConversation discussion={discussion} metaMap={metaMap} />}
        {messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageCard key={m.id} message={m} metaMap={metaMap} />
            ))}
          </div>
        )}
      </main>

      <div className="sticky bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur">
        {showJump && messages.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute -top-12 left-1/2 flex -translate-x-1/2 animate-fade-in items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg shadow-lg"
          >
            <IconArrowDown size={14} />
            Jump to latest
          </button>
        )}
        <div className="mx-auto max-w-3xl space-y-2.5 px-4 pb-safe pt-3">
          {offline && (
            <div className="flex animate-fade-in items-center gap-2.5 rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-sm text-fg" role="alert">
              <IconWifiOff size={16} className="shrink-0 text-warn" />
              Connection lost. Reconnecting automatically…
            </div>
          )}
          {turnError && driving && (
            <div className="animate-fade-in rounded-xl border border-danger/30 bg-danger/10 p-3" role="alert">
              <div className="flex items-start gap-2.5">
                <IconAlert size={16} className="mt-0.5 shrink-0 text-danger" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-fg">{turnError.message}</p>
                  {!turnError.retryable && (
                    <p className="mt-1 text-xs text-muted">Retrying will not help here. This needs a fix in the server settings.</p>
                  )}
                </div>
                {turnError.retryable && (
                  <button
                    type="button"
                    onClick={room.retry}
                    className="shrink-0 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-bg transition hover:opacity-90"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
          {discussion && finished && <FinishedBanner discussion={discussion} id={id} onResume={() => setResumeOpen(true)} />}
          {discussion && !finished && (
            <Controls
              discussion={discussion}
              busy={room.busy}
              sending={room.sending}
              onPause={room.pause}
              onResume={room.resume}
              onInterrupt={room.interrupt}
              onEnd={room.end}
              onSend={room.sendMessage}
            />
          )}
          {!discussion && <div className="h-10" />}
          {discussion && finished && (
            <button type="button" onClick={() => navigate('/history')} className="w-full text-center text-xs text-muted hover:text-fg">
              Back to history
            </button>
          )}
        </div>
      </div>
      {discussion && (
        <ResumeDialog
          open={resumeOpen}
          discussionId={id}
          topic={discussion.topic}
          onClose={() => setResumeOpen(false)}
          onResumed={(next) => {
            setResumeOpen(false);
            atBottomRef.current = true;
            room.resumed(next);
          }}
        />
      )}
    </div>
  );
}

export default function Room() {
  const { id } = useParams();
  return <RoomView key={id} id={id} />;
}
