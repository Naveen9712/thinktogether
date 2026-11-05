// Discussions this browser created, remembered with their secret access token.
// Shape: [{ id, token, topic, created_at }], newest first, capped at MAX_SESSIONS.
const KEY = 'tt_sessions';
const MAX_SESSIONS = 50;

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

export function getToken(id) {
  const found = read().find((s) => String(s.id) === String(id));
  return found ? found.token : null;
}
