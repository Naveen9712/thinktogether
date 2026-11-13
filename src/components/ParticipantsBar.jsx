import Avatar from './Avatar.jsx';
import SpeakingIndicator from './SpeakingIndicator.jsx';
import { metaFromParticipant, orderedParticipants, stanceLabel } from '../lib/participants.js';

function stateFor(key, discussion, hasText) {
  const { status, generating, current_speaker: current, next_speaker: next } = discussion;
  if (generating && current === key) {
    return { speaking: true, text: hasText ? 'Speaking…' : 'Thinking…' };
  }
  if (status === 'active' || status === 'concluding') {
    return { speaking: false, text: next === key ? 'Up next' : 'Listening' };
  }
  if (status === 'waiting_user') return { speaking: false, text: 'Waiting' };
  if (status === 'paused') return { speaking: false, text: 'Paused' };
  return { speaking: false, text: 'Done' };
}

function Card({ meta, discussion, hasText, compact }) {
  const s = meta.style;
  const state = stateFor(meta.key, discussion, hasText);
  const detail = [meta.moderator ? 'Moderator' : meta.label, meta.stance ? stanceLabel(meta.stance) : ''].filter(Boolean).join(' · ');
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-300 ${
        state.speaking ? `${s.border} ${s.soft} ${s.glow}` : 'border-line bg-surface'
      } ${compact ? 'w-[11.5rem] shrink-0 snap-start sm:w-auto sm:shrink' : ''}`}
      title={meta.description || detail}
    >
      <Avatar meta={meta} size={32} speaking={state.speaking} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-semibold leading-tight ${s.text}`}>{meta.name}</p>
        <p className="truncate text-[11px] leading-tight text-muted">{detail}</p>
      </div>
      <div className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${state.speaking ? s.text : 'text-muted'}`}>
        {state.speaking && <SpeakingIndicator variant="wave" colorClass={s.text} />}
        <span className={compact ? 'hidden lg:inline' : 'hidden min-[420px]:inline'}>{state.text}</span>
      </div>
    </div>
  );
}

/**
 * Every AI in the room (participants by seat, then Gamma). Two AIs share one row; with more, the row scrolls
 * sideways on phones and wraps into a grid on larger screens. `streamingHasText` = the current reply has words.
 */
export default function ParticipantsBar({ discussion, streamingHasText }) {
  const metas = orderedParticipants(discussion).map(metaFromParticipant);
  const many = metas.length > 2;
  const cols = metas.length === 4 ? 'sm:grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-3';
  return (
    <div
      className={many ? `-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 ${cols}` : 'grid grid-cols-2 gap-2'}
      aria-label="AI participants"
    >
      {metas.map((meta) => (
        <Card key={meta.key} meta={meta} discussion={discussion} hasText={streamingHasText} compact={many} />
      ))}
    </div>
  );
}
