// Display helpers shared by the whole UI: time, status labels and AI identity metadata.

export const AGENTS = {
  alpha: {
    key: 'alpha',
    name: 'AI Alpha',
    label: 'Analytical Thinker',
    blurb: 'Breaks problems into evidence, logic and testable claims.',
    text: 'text-alpha',
    bg: 'bg-alpha',
    soft: 'bg-alpha/10',
    border: 'border-alpha/30',
    borderStrong: 'border-alpha',
    ring: 'ring-alpha/40',
    glow: 'shadow-[0_0_0_1px_rgb(var(--alpha)/0.35),0_8px_30px_-12px_rgb(var(--alpha)/0.45)]',
  },
  beta: {
    key: 'beta',
    name: 'AI Beta',
    label: 'Philosophical Thinker',
    blurb: 'Explores meaning, assumptions and the questions behind the question.',
    text: 'text-beta',
    bg: 'bg-beta',
    soft: 'bg-beta/10',
    border: 'border-beta/30',
    borderStrong: 'border-beta',
    ring: 'ring-beta/40',
    glow: 'shadow-[0_0_0_1px_rgb(var(--beta)/0.35),0_8px_30px_-12px_rgb(var(--beta)/0.45)]',
  },
  user: {
    key: 'user',
    name: 'You',
    label: 'Human participant',
    blurb: '',
    text: 'text-you',
    bg: 'bg-you',
    soft: 'bg-you/10',
    border: 'border-you/30',
    borderStrong: 'border-you',
    ring: 'ring-you/40',
    glow: '',
  },
};

export const DEPTHS = [
  { value: 'casual', title: 'Casual', description: 'Light, conversational and easy to follow.' },
  { value: 'detailed', title: 'Detailed', description: 'Structured reasoning with examples and counterpoints.' },
  { value: 'deep', title: 'Deep intellectual exploration', description: 'Rigorous, layered and willing to challenge assumptions.' },
];

export const DEPTH_LABELS = { casual: 'Casual', detailed: 'Detailed', deep: 'Deep' };

export const STATUS_META = {
  active: { label: 'Live', cls: 'border-ok/30 bg-ok/10 text-ok', dot: 'bg-ok', pulse: true },
  paused: { label: 'Paused', cls: 'border-warn/30 bg-warn/10 text-warn', dot: 'bg-warn', pulse: false },
  waiting_user: { label: 'Waiting for you', cls: 'border-warn/40 bg-warn/15 text-warn', dot: 'bg-warn', pulse: true },
  concluding: { label: 'Wrapping up', cls: 'border-beta/30 bg-beta/10 text-beta', dot: 'bg-beta', pulse: true },
  completed: { label: 'Completed', cls: 'border-alpha/30 bg-alpha/10 text-alpha', dot: 'bg-alpha', pulse: false },
  ended: { label: 'Ended', cls: 'border-line bg-surface-2 text-muted', dot: 'bg-muted', pulse: false },
};

/** Statuses where the room can still be opened and interacted with. */
export const LIVE_STATUSES = ['active', 'paused', 'waiting_user', 'concluding'];

/** Statuses where this tab must keep calling next-turn.php. */
export const DRIVING_STATUSES = ['active', 'concluding'];

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function formatClock(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

const ERROR_TEXT = {
  ai_invalid_key: 'The Gemini API key is missing or invalid. Check the key in the server configuration.',
  ai_quota_exceeded: 'The Gemini usage limit was reached. Wait a minute, then retry.',
  ai_unavailable: 'The AI service is temporarily unavailable. Try again shortly.',
  ai_timeout: 'The AI took too long to answer. Try again.',
  ai_blocked: 'The AI declined to answer because of its safety filters. Retry, or steer the conversation with a message.',
  ai_bad_response: 'The AI returned an unusable response. Try again.',
  db_unavailable: 'The database is unavailable right now. Try again shortly.',
  server_error: 'The server hit an unexpected error. Try again.',
  not_found: 'This discussion could not be found.',
  no_access: 'You do not have access to this discussion on this device.',
  invalid_state: 'That action is not available in the current state of the discussion.',
  not_interruptible: 'There is nothing to interrupt right now.',
  generation_in_progress: 'An AI is still answering. Try again in a moment.',
  ECONNABORTED: 'The request timed out. Check your connection and retry.',
  ERR_NETWORK: 'Cannot reach the server. Check your connection.',
};

/** Turns an Error from the API client into a short sentence for the user. */
export function friendlyError(err) {
  if (!err) return 'Something went wrong.';
  if (err.code && ERROR_TEXT[err.code]) return ERROR_TEXT[err.code];
  if (!err.status && !err.code) return err.message || 'Something went wrong.';
  return err.message || 'Something went wrong.';
}
