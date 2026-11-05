import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useDiscussionRoom from '../hooks/useDiscussionRoom.js';
import RoomHeader from '../components/RoomHeader.jsx';
import ParticipantsBar from '../components/ParticipantsBar.jsx';
import MessageCard from '../components/MessageCard.jsx';
import Controls from '../components/Controls.jsx';
import ErrorState from '../components/ErrorState.jsx';
import SpeakingIndicator from '../components/SpeakingIndicator.jsx';
import Avatar from '../components/Avatar.jsx';
import { MessageSkeletons } from '../components/Skeleton.jsx';
import { IconAlert, IconArrowDown, IconWifiOff } from '../components/Icons.jsx';
import { AGENTS } from '../lib/format.js';

const NEAR_BOTTOM_PX = 120;

function distanceFromBottom() {
  const doc = document.documentElement;
  return doc.scrollHeight - (window.scrollY + window.innerHeight);
}

function EmptyConversation({ discussion }) {
  const next = AGENTS[discussion.next_speaker] || AGENTS.alpha;
  const running = discussion.status === 'active' || discussion.status === 'concluding';
  return (
    <div className="flex animate-fade-in flex-col items-center px-4 py-16 text-center">
      <Avatar who={discussion.next_speaker === 'beta' ? 'beta' : 'alpha'} size={56} speaking={running} />
      <h2 className="mt-5 text-base font-semibold text-fg">
        {running ? `${next.name} is preparing the opening thoughts` : 'No messages yet'}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        {running
          ? 'The first response usually takes a few seconds. You can step in at any time.'
          : 'Messages will appear here once the discussion continues.'}
      </p>
      {running && <SpeakingIndicator variant="dots" colorClass={next.text} className="mt-4" />}
    </div>
  );
}

function FinishedBanner({ discussion, id }) {
  const completed = discussion.status === 'completed';
  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-fg">{completed ? 'This discussion is complete.' : 'You ended this discussion.'}</p>
      <p className="mt-0.5 text-sm text-muted">
        {completed
          ? 'The thinkers shared their closing thoughts and the summary is ready.'
          : 'No closing thoughts were generated, but you can still create a summary.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/summary/${id}`} className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
          View summary
        </Link>
        <Link to="/" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-2">
          New discussion
        </Link>
      </div>
    </div>
  );
}

function RoomView({ id }) {
  const room = useDiscussionRoom(id);
  const { discussion, messages, clock, fatal, offline, turnError } = room;
  const navigate = useNavigate();
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

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

  if (fatal) {
    const noAccess = fatal === 'no_access' || fatal === 'not_found';
    return (
      <ErrorState
        tone="muted"
        title={noAccess ? "You don't have access to this discussion" : 'Could not open this discussion'}
        message={
          noAccess
            ? 'This discussion was not started from this browser, or it no longer exists. Discussions are private to the device that created them.'
            : 'Something went wrong while loading the room.'
        }
      >
        <Link to="/" className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
          Back to home
        </Link>
      </ErrorState>
    );
  }

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
        {!discussion && <MessageSkeletons count={3} />}
        {discussion && messages.length === 0 && <EmptyConversation discussion={discussion} />}
        {messages.length > 0 && (
          <div className="space-y-4" aria-live="off">
            {messages.map((m) => (
              <MessageCard key={m.id} message={m} />
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
                <p className="min-w-0 flex-1 break-words text-sm text-fg">{turnError.message}</p>
                <button
                  type="button"
                  onClick={room.retry}
                  className="shrink-0 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-bg transition hover:opacity-90"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          {discussion && finished && <FinishedBanner discussion={discussion} id={id} />}
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
    </div>
  );
}

export default function Room() {
  const { id } = useParams();
  return <RoomView key={id} id={id} />;
}
