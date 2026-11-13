// Who is who in a discussion: seat colours, personality icons and display names.
// The server sends `discussion.participants` ([{ key, name, role, seat, personality: { name, icon, ... }, stance }]).
// Tailwind only ships classes it can see in the source, so every colour class is written out in full here.

export const SEAT_STYLES = {
  alpha: {
    text: 'text-alpha', bg: 'bg-alpha', soft: 'bg-alpha/10', border: 'border-alpha/30', borderStrong: 'border-alpha',
    glow: 'shadow-[0_0_0_1px_rgb(var(--alpha)/0.35),0_8px_30px_-12px_rgb(var(--alpha)/0.45)]',
  },
  beta: {
    text: 'text-beta', bg: 'bg-beta', soft: 'bg-beta/10', border: 'border-beta/30', borderStrong: 'border-beta',
    glow: 'shadow-[0_0_0_1px_rgb(var(--beta)/0.35),0_8px_30px_-12px_rgb(var(--beta)/0.45)]',
  },
  gamma: {
    text: 'text-gamma', bg: 'bg-gamma', soft: 'bg-gamma/10', border: 'border-gamma/30', borderStrong: 'border-gamma',
    glow: 'shadow-[0_0_0_1px_rgb(var(--gamma)/0.35),0_8px_30px_-12px_rgb(var(--gamma)/0.45)]',
  },
  delta: {
    text: 'text-delta', bg: 'bg-delta', soft: 'bg-delta/10', border: 'border-delta/30', borderStrong: 'border-delta',
    glow: 'shadow-[0_0_0_1px_rgb(var(--delta)/0.35),0_8px_30px_-12px_rgb(var(--delta)/0.45)]',
  },
  epsilon: {
    text: 'text-epsilon', bg: 'bg-epsilon', soft: 'bg-epsilon/10', border: 'border-epsilon/30', borderStrong: 'border-epsilon',
    glow: 'shadow-[0_0_0_1px_rgb(var(--epsilon)/0.35),0_8px_30px_-12px_rgb(var(--epsilon)/0.45)]',
  },
  zeta: {
    text: 'text-zeta', bg: 'bg-zeta', soft: 'bg-zeta/10', border: 'border-zeta/30', borderStrong: 'border-zeta',
    glow: 'shadow-[0_0_0_1px_rgb(var(--zeta)/0.35),0_8px_30px_-12px_rgb(var(--zeta)/0.45)]',
  },
  user: {
    text: 'text-you', bg: 'bg-you', soft: 'bg-you/10', border: 'border-you/30', borderStrong: 'border-you', glow: '',
  },
};

// Seats beyond the five colours (allowed later via MAX_PARTICIPANTS) reuse the palette in order.
const EXTRA_SEATS = { eta: 'alpha', theta: 'beta', iota: 'delta' };

export const SEAT_NAMES = ['AI Alpha', 'AI Beta', 'AI Delta', 'AI Epsilon', 'AI Zeta'];
export const SEAT_KEYS = ['alpha', 'beta', 'delta', 'epsilon', 'zeta'];

export function seatStyle(key) {
  return SEAT_STYLES[key] || SEAT_STYLES[EXTRA_SEATS[key]] || SEAT_STYLES.alpha;
}

// Discussions from before participants existed (and older API responses) have exactly these two.
const LEGACY = [
  { key: 'alpha', name: 'AI Alpha', role: 'participant', seat: 1, personality: { name: 'Analytical Thinker', icon: 'analytical', description: '' }, stance: null },
  { key: 'beta', name: 'AI Beta', role: 'participant', seat: 2, personality: { name: 'Philosophical Thinker', icon: 'philosophical', description: '' }, stance: null },
];

/** Participants in display order: the AI participants by seat, then Gamma (the moderator). */
export function orderedParticipants(discussion) {
  const list = discussion && Array.isArray(discussion.participants) && discussion.participants.length ? discussion.participants : LEGACY;
  const speakers = list.filter((p) => p.role !== 'moderator').sort((a, b) => a.seat - b.seat);
  const moderator = list.filter((p) => p.role === 'moderator');
  return [...speakers, ...moderator];
}

/** Everything the UI needs to show one speaker. Works for 'user' too. */
export function metaFromParticipant(p) {
  const moderator = p.role === 'moderator';
  return {
    key: p.key,
    name: p.name,
    label: moderator ? 'Moderator & Skeptic' : p.personality?.name || '',
    description: p.personality?.description || '',
    icon: p.personality?.icon || (moderator ? 'moderator' : 'custom'),
    stance: p.stance || null,
    moderator,
    style: seatStyle(p.key),
  };
}

export const USER_META = {
  key: 'user', name: 'You', label: 'Human participant', description: '', icon: 'user', stance: null, moderator: false, style: SEAT_STYLES.user,
};

/** speaker key -> meta, for one discussion. */
export function participantMap(discussion) {
  const map = { user: USER_META };
  orderedParticipants(discussion).forEach((p) => {
    map[p.key] = metaFromParticipant(p);
  });
  return map;
}

/** A stable string that changes only when the participants change (for useMemo). */
export function participantsKey(discussion) {
  if (!discussion || !Array.isArray(discussion.participants)) return 'legacy';
  return discussion.participants.map((p) => `${p.key}:${p.personality?.name}:${p.stance || ''}`).join('|');
}

/** Meta for a speaker that may be missing from the map (e.g. data from an older version). */
export function metaFor(map, key) {
  if (map[key]) return map[key];
  const name = key ? `AI ${key.charAt(0).toUpperCase()}${key.slice(1)}` : 'AI';
  return { key, name, label: '', description: '', icon: 'custom', stance: null, moderator: false, style: seatStyle(key) };
}

export function stanceLabel(stance) {
  if (stance === 'for') return 'For';
  if (stance === 'against') return 'Against';
  return '';
}

/**
 * Seats for the start form: keeps the current choices that still exist (no duplicates), then fills up to
 * `count` from the server's default order. `options` = the response of discussions/options.php.
 */
export function fillSeats(options, count, current = []) {
  const valid = new Set([...options.builtin, ...options.custom].map((p) => p.ref));
  const seats = [];
  current.forEach((r) => {
    if (seats.length < count && valid.has(r) && !seats.includes(r)) seats.push(r);
  });
  for (const r of options.default_order) {
    if (seats.length >= count) break;
    if (valid.has(r) && !seats.includes(r)) seats.push(r);
  }
  for (const p of [...options.builtin, ...options.custom]) {
    if (seats.length >= count) break;
    if (!seats.includes(p.ref)) seats.push(p.ref);
  }
  return seats;
}

/**
 * Personality name and icon of one participant. Lists (history, admin) send a flat shape
 * ({ personality: 'Analytical Thinker', icon }), the room sends { personality: { name, icon, ... } }.
 */
export function personalityOf(p) {
  if (p && p.personality && typeof p.personality === 'object') {
    return { name: p.personality.name || '', icon: p.personality.icon || p.icon || '' };
  }
  return { name: (p && p.personality) || '', icon: (p && p.icon) || '' };
}
