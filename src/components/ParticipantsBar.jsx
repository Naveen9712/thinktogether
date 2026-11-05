import Avatar from './Avatar.jsx';
import SpeakingIndicator from './SpeakingIndicator.jsx';
import { AGENTS } from '../lib/format.js';

function stateFor(key, discussion, hasText) {
  const { status, generating, current_speaker: current, next_speaker: next } = discussion;
  if (generating && current === key) {
    return { speaking: true, text: hasText ? 'Speaking…' : 'Thinking…' };
  }
  if (status === 'active' || status === 'concluding') {
    return { speaking: false, text: next === key ? 'Up next' : 'Listening' };
  }
  if (status === 'waiting_user') return { speaking: false, text: 'Waiting for you' };
  if (status === 'paused') return { speaking: false, text: 'Paused' };
  return { speaking: false, text: 'Done' };
}

function Card({ who, discussion, hasText }) {
  const agent = AGENTS[who];
  const state = stateFor(who, discussion, hasText);
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-300 ${
        state.speaking ? `${agent.border} ${agent.soft} ${agent.glow}` : 'border-line bg-surface'
      }`}
    >
      <Avatar who={who} size={32} speaking={state.speaking} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-semibold leading-tight ${agent.text}`}>{agent.name}</p>
        <p className="truncate text-[11px] leading-tight text-muted">{agent.label}</p>
      </div>
      <div className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${state.speaking ? agent.text : 'text-muted'}`}>
        {state.speaking && <SpeakingIndicator variant="wave" colorClass={agent.text} />}
        <span className="hidden min-[420px]:inline">{state.text}</span>
      </div>
    </div>
  );
}

/** `streamingHasText` tells us whether the in-progress message already has words in it. */
export default function ParticipantsBar({ discussion, streamingHasText }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Card who="alpha" discussion={discussion} hasText={streamingHasText} />
      <Card who="beta" discussion={discussion} hasText={streamingHasText} />
    </div>
  );
}
