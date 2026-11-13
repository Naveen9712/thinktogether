import { memo } from 'react';
import Avatar from './Avatar.jsx';
import SpeakingIndicator from './SpeakingIndicator.jsx';
import { formatClock } from '../lib/format.js';
import { USER_META, metaFor, participantMap, stanceLabel } from '../lib/participants.js';
import { parseRichText } from '../lib/richText.js';

// Without a discussion (older data), speakers are the original AI Alpha and AI Beta.
const DEFAULT_MAP = participantMap(null);

function Tag({ children, cls }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{children}</span>;
}

function Tags({ message, meta }) {
  const status = message.generation_status;
  return (
    <>
      {meta && meta.moderator && <Tag cls={`${meta.style.border} ${meta.style.soft} ${meta.style.text}`}>Moderator</Tag>}
      {meta && meta.stance && <Tag cls="border-line bg-surface-2 text-muted">{stanceLabel(meta.stance)}</Tag>}
      {message.kind === 'closing' && <Tag cls="border-beta/30 bg-beta/10 text-beta">{meta && meta.moderator ? 'Final wrap-up' : 'Closing thoughts'}</Tag>}
      {status === 'interrupted' && <Tag cls="border-warn/30 bg-warn/10 text-warn">Interrupted</Tag>}
      {status === 'failed' && <Tag cls="border-danger/30 bg-danger/10 text-danger">Failed</Tag>}
    </>
  );
}

/**
 * Point-by-point text: lines starting with "- " become a list, other lines paragraphs.
 * Always plain text (React escapes it); nothing is ever inserted as HTML.
 */
export function RichText({ text, caret = null, dotClass = 'bg-muted' }) {
  const blocks = parseRichText(text);
  return (
    <div className="space-y-2 break-words text-[15px] leading-relaxed text-fg">
      {blocks.map((b, i) => {
        const last = i === blocks.length - 1;
        if (b.type === 'ul') {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className={`mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
                  <span className="min-w-0">
                    {item}
                    {last && j === b.items.length - 1 && caret}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {b.text}
            {last && caret}
          </p>
        );
      })}
      {blocks.length === 0 && caret}
    </div>
  );
}

function Body({ message, meta }) {
  const generating = message.generation_status === 'generating';
  const text = message.message || '';
  const tone = meta.style.text;
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
  return <RichText text={text} dotClass={meta.style.bg} caret={generating ? <span className={`caret animate-blink ${tone}`} /> : null} />;
}

/**
 * One message. `metaMap` (from participantMap(discussion)) gives each speaker its name, personality and colour;
 * without it, the original Alpha/Beta identities are used.
 */
function MessageCard({ message, metaMap = null }) {
  const { speaker } = message;
  const generating = message.generation_status === 'generating';
  const time = formatClock(message.created_at);

  if (speaker === 'system') {
    const resumed = /resumed/i.test(message.message || '');
    return (
      <div className="flex animate-fade-in items-center gap-3 py-1" role="separator" aria-label={message.message}>
        <span className="h-px flex-1 bg-line" />
        <span className={`max-w-[80%] whitespace-pre-wrap break-words rounded-full border px-3 py-1 text-center text-xs ${resumed ? 'border-alpha/30 bg-alpha/10 font-semibold text-alpha' : 'border-line bg-surface-2 text-muted'}`}>
          {message.message}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
    );
  }

  if (speaker === 'user') {
    const you = USER_META.style;
    return (
      <article className="flex animate-fade-up justify-end gap-3">
        <div className={`min-w-0 max-w-[88%] rounded-2xl rounded-tr-md border ${you.border} ${you.soft} px-4 py-3 sm:max-w-[80%]`}>
          <div className="mb-1 flex items-center justify-end gap-2">
            <Tags message={message} meta={null} />
            {time && <span className="text-[11px] tabular-nums text-muted">{time}</span>}
            <span className={`text-sm font-semibold ${you.text}`}>You</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg">{message.message}</p>
        </div>
        <Avatar meta={USER_META} size={36} />
      </article>
    );
  }

  const meta = metaFor(metaMap || DEFAULT_MAP, speaker);
  const s = meta.style;

  return (
    <article className="flex animate-fade-up gap-3">
      <Avatar meta={meta} size={36} speaking={generating} />
      <div
        className={`min-w-0 flex-1 rounded-2xl rounded-tl-md border px-4 py-3 ${
          generating ? `bg-surface ${s.border} ${s.glow}` : meta.moderator ? `${s.border} ${s.soft}` : 'border-line bg-surface'
        }`}
      >
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-sm font-semibold ${s.text}`}>{meta.name}</span>
          {meta.label && !meta.moderator && <span className="text-xs text-muted">{meta.label}</span>}
          <Tags message={message} meta={meta} />
          {time && <span className="ml-auto text-[11px] tabular-nums text-muted">{time}</span>}
        </div>
        <Body message={message} meta={meta} />
      </div>
    </article>
  );
}

export default memo(MessageCard);
