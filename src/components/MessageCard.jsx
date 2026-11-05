import { memo } from 'react';
import Avatar from './Avatar.jsx';
import SpeakingIndicator from './SpeakingIndicator.jsx';
import { AGENTS, formatClock } from '../lib/format.js';

function Tag({ children, cls }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{children}</span>;
}

function Tags({ message }) {
  const status = message.generation_status;
  return (
    <>
      {message.kind === 'closing' && <Tag cls="border-beta/30 bg-beta/10 text-beta">Closing thoughts</Tag>}
      {status === 'interrupted' && <Tag cls="border-warn/30 bg-warn/10 text-warn">Interrupted</Tag>}
      {status === 'failed' && <Tag cls="border-danger/30 bg-danger/10 text-danger">Failed</Tag>}
    </>
  );
}

/** Message text is always rendered as plain text; React escapes it. */
function Body({ message, tone }) {
  const generating = message.generation_status === 'generating';
  const text = message.message || '';
  if (!text && generating) {
    return (
      <div className={`flex items-center gap-2 py-1 text-sm ${tone}`}>
        <SpeakingIndicator variant="dots" colorClass={tone} />
        <span className="text-muted">Thinking…</span>
      </div>
    );
  }
  if (!text) {
    return <p className="text-sm italic text-muted">No text was produced before this turn stopped.</p>;
  }
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg">
      {text}
      {generating && <span className={`caret animate-blink ${tone}`} />}
    </p>
  );
}

function MessageCard({ message }) {
  const { speaker } = message;
  const generating = message.generation_status === 'generating';
  const time = formatClock(message.created_at);

  if (speaker === 'system') {
    return (
      <div className="animate-fade-in py-1 text-center">
        <span className="inline-block max-w-full whitespace-pre-wrap break-words rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
          {message.message}
        </span>
      </div>
    );
  }

  if (speaker === 'user') {
    const you = AGENTS.user;
    return (
      <article className="flex animate-fade-up justify-end gap-3">
        <div className={`min-w-0 max-w-[88%] rounded-2xl rounded-tr-md border ${you.border} ${you.soft} px-4 py-3 sm:max-w-[80%]`}>
          <div className="mb-1 flex items-center justify-end gap-2">
            <Tags message={message} />
            {time && <span className="text-[11px] tabular-nums text-muted">{time}</span>}
            <span className={`text-sm font-semibold ${you.text}`}>You</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg">{message.message}</p>
        </div>
        <Avatar who="user" size={36} />
      </article>
    );
  }

  const agent = AGENTS[speaker];
  if (!agent) return null;

  return (
    <article className="flex animate-fade-up gap-3">
      <Avatar who={speaker} size={36} speaking={generating} />
      <div className={`min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-surface px-4 py-3 ${generating ? `${agent.border} ${agent.glow}` : 'border-line'}`}>
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-sm font-semibold ${agent.text}`}>{agent.name}</span>
          <span className="text-xs text-muted">{agent.label}</span>
          <Tags message={message} />
          {time && <span className="ml-auto text-[11px] tabular-nums text-muted">{time}</span>}
        </div>
        <Body message={message} tone={agent.text} />
      </div>
    </article>
  );
}

export default memo(MessageCard);
