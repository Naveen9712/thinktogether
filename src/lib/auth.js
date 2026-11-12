// The signed-in account, remembered in this browser: { token, user: { id, name, username } }.
// The token is a random 64-hex session id; the server stores only its hash and can revoke it (logout).
const KEY = 'tt_auth';
export const SESSION_EXPIRED_EVENT = 'tt:session-expired';

export function getAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data.token === 'string' && /^[a-f0-9]{64}$/.test(data.token) && data.user) return data;
  } catch {
    // Blocked or corrupt storage: behave as a guest.
  }
  return null;
}

export function setAuth(auth) {
  try {
    if (auth) localStorage.setItem(KEY, JSON.stringify({ token: auth.token, user: auth.user }));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the login only lasts for this page view.
  }
}

export function getAuthToken() {
  const a = getAuth();
  return a ? a.token : null;
}

/** Only allow in-app paths after login (blocks //evil.com and /\evil.com style open redirects). */
export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
  return next;
}
