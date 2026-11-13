import axios from 'axios';
import { getToken } from './sessions.js';
import { SESSION_EXPIRED_EVENT, getAuthToken, setAuth } from './auth.js';

/**
 * One Axios instance for the whole app. Every PHP endpoint returns
 *   { ok: true, data } or { ok: false, error: { code, message, details } }
 * so we unwrap that here and throw a normal Error on failure
 * (with .code, .status and .details).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

// Signed in: every request carries the login session (header, not cookie: the API is on another domain).
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.skipAuth) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.data && res.data.ok === false) {
      const err = new Error(res.data.error?.message || 'Request failed');
      err.code = res.data.error?.code;
      err.details = res.data.error?.details;
      err.status = res.status;
      return Promise.reject(err);
    }
    return res.data?.data ?? res.data;
  },
  (error) => {
    const apiErr = error.response?.data?.error;
    const err = new Error(
      apiErr?.message ||
        (error.code === 'ECONNABORTED'
          ? 'The request timed out.'
          : error.response
          ? `Server error (${error.response.status}).`
          : 'Cannot reach the server.')
    );
    err.code = apiErr?.code || error.code;
    err.details = apiErr?.details;
    err.status = error.response?.status;
    if (err.code === 'session_expired') {
      // The server no longer knows this login (logged out elsewhere or expired): become a guest.
      setAuth(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(err);
  }
);

export const ping = () => api.get('/ping.php');

// ------------------------------------------------------------------ accounts
const AUTH = '/auth';

export const signup = (payload) => api.post(`${AUTH}/signup.php`, payload, { skipAuth: true });
export const login = (payload) => api.post(`${AUTH}/login.php`, payload, { skipAuth: true });
export const passwordHint = (username) => api.post(`${AUTH}/hint.php`, { username }, { skipAuth: true });
export const me = () => api.get(`${AUTH}/me.php`);
export const logout = () => api.post(`${AUTH}/logout.php`, {});
/** Moves guest discussions from this browser into the signed-in account. sessions: [{ id, token }] */
export const claimDiscussions = (sessions) =>
  api.post(`${AUTH}/claim.php`, { discussions: sessions.slice(0, 50).map((s) => ({ id: Number(s.id), token: s.token })) });

// ------------------------------------------------------------------ discussions
const BASE = '/discussions';
// Must stay above the server's REQUEST_BUDGET_SECONDS (140 s) so the browser never gives up first.
const LONG_TIMEOUT = 170000;

function noAccess() {
  const err = new Error('You do not have access to this discussion on this device.');
  err.code = 'no_access';
  return err;
}

/**
 * Builds the Axios config for a discussion call. Guests prove access with the discussion's secret token;
 * signed-in users' own discussions are authorised by the login session alone.
 */
function withToken(id, config = {}) {
  const token = getToken(id);
  if (!token && !getAuthToken()) throw noAccess();
  if (!token) return config;
  return { ...config, headers: { ...(config.headers || {}), 'X-Discussion-Token': token } };
}

const num = (id) => Number(id);

export async function createDiscussion(payload) {
  return api.post(`${BASE}/create.php`, payload);
}

/** Modes, personalities (built-in + the user's own), Gamma and participant limits for the start form. */
export async function getOptions(opts = {}) {
  return api.get(`${BASE}/options.php`, { signal: opts.signal });
}

/** "Resume conversation": reopen a finished discussion for extraMinutes more, optionally with a new question. */
export async function continueDiscussion(id, extraMinutes, question = '', opts = {}) {
  const body = { id: num(id), extra_minutes: extraMinutes };
  if (question && question.trim()) body.question = question.trim();
  return api.post(`${BASE}/continue.php`, body, withToken(id, { signal: opts.signal }));
}

export async function getMessages(id, after = 0, opts = {}) {
  return api.get(`${BASE}/messages.php`, withToken(id, { params: { id: num(id), after }, signal: opts.signal }));
}

export async function getStatus(id, opts = {}) {
  return api.get(`${BASE}/status.php`, withToken(id, { params: { id: num(id) }, signal: opts.signal }));
}

export async function nextTurn(id, opts = {}) {
  return api.post(`${BASE}/next-turn.php`, { id: num(id) }, withToken(id, { timeout: LONG_TIMEOUT, signal: opts.signal }));
}

export async function interrupt(id, opts = {}) {
  return api.post(`${BASE}/interrupt.php`, { id: num(id) }, withToken(id, { signal: opts.signal }));
}

export async function sendUserMessage(id, message, opts = {}) {
  return api.post(`${BASE}/user-message.php`, { id: num(id), message }, withToken(id, { signal: opts.signal }));
}

export async function pause(id, opts = {}) {
  return api.post(`${BASE}/pause.php`, { id: num(id) }, withToken(id, { signal: opts.signal }));
}

export async function resume(id, opts = {}) {
  return api.post(`${BASE}/resume.php`, { id: num(id) }, withToken(id, { signal: opts.signal }));
}

export async function end(id, opts = {}) {
  return api.post(`${BASE}/end.php`, { id: num(id) }, withToken(id, { signal: opts.signal }));
}

export async function getSummary(id, opts = {}) {
  return api.get(`${BASE}/summary.php`, withToken(id, { params: { id: num(id) }, signal: opts.signal }));
}

export async function generateSummary(id, opts = {}) {
  return api.post(`${BASE}/generate-summary.php`, { id: num(id) }, withToken(id, { timeout: LONG_TIMEOUT, signal: opts.signal }));
}

// ------------------------------------------------------------------ custom personalities (signed in)
const PERSONALITIES = '/personalities';

export const listPersonalities = (opts = {}) => api.get(`${PERSONALITIES}/list.php`, { signal: opts.signal });
/** Creates (no id) or updates (with id) one of the user's personalities. */
export const savePersonality = (payload) => api.post(`${PERSONALITIES}/save.php`, payload);
export const deletePersonality = (id) => api.post(`${PERSONALITIES}/delete.php`, { id: Number(id) });

/** Signed in: the account's discussions (paged). */
export async function getAccountHistory({ offset = 0, limit = 50, signal } = {}) {
  return api.get(`${BASE}/history.php`, { params: { offset, limit }, signal });
}

/** Guest: discussions saved on this device. sessions: [{ id, token }]; at most 30 pairs are sent. */
export async function getDeviceHistory(sessions, opts = {}) {
  const header = sessions
    .slice(0, 30)
    .map((s) => `${s.id}:${s.token}`)
    .join(',');
  return api.get(`${BASE}/history.php`, { headers: { 'X-History-Tokens': header }, signal: opts.signal, skipAuth: true });
}
