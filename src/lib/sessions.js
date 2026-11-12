// GUEST discussions this browser created, remembered with their secret access token.
// (Signed-in users' discussions live in their account instead.)
// Shape: [{ id, token, topic, created_at }], newest first, capped at MAX_SESSIONS
// (the same number history.php accepts, so nothing is ever hidden).
const KEY = 'tt_sessions';
export const MAX_SESSIONS = 30;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((s) => s && s.id != null && typeof s.token === 'string' && s.token !== '');
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage may be full or blocked (private mode); the session just will not be remembered.
  }
}

export function getSessions() {
  return read();
}

export function saveSession(session) {
  const entry = {
    id: session.id,
    token: session.token,
    topic: session.topic,
    created_at: session.created_at || new Date().toISOString(),
  };
  const rest = read().filter((s) => String(s.id) !== String(entry.id));
  write([entry, ...rest].slice(0, MAX_SESSIONS));
}

export function removeSession(id) {
  write(read().filter((s) => String(s.id) !== String(id)));
}

/** Forget several discussions at once (e.g. after they were moved into the user's account). */
export function removeSessions(ids) {
  const drop = new Set(ids.map(String));
  write(read().filter((s) => !drop.has(String(s.id))));
}

export function getToken(id) {
  const found = read().find((s) => String(s.id) === String(id));
  return found ? found.token : null;
}
