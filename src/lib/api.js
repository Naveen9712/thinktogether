import axios from 'axios';
import { getToken } from './sessions.js';

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
    return Promise.reject(err);
  }
);

export const ping = () => api.get('/ping.php');

const BASE = '/discussions';
const LONG_TIMEOUT = 120000;

function noAccess() {
  const err = new Error('You do not have access to this discussion on this device.');
  err.code = 'no_access';
  return err;
}

/** Builds the Axios config for a discussion call, adding the secret token header. */
function withToken(id, config = {}) {
  const token = getToken(id);
  if (!token) throw noAccess();
  return { ...config, headers: { ...(config.headers || {}), 'X-Discussion-Token': token } };
}

const num = (id) => Number(id);

export async function createDiscussion(payload) {
  return api.post(`${BASE}/create.php`, payload);
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

/** sessions: [{ id, token }]; at most 30 pairs are sent. */
export async function getHistory(sessions, opts = {}) {
  const header = sessions
    .slice(0, 30)
    .map((s) => `${s.id}:${s.token}`)
    .join(',');
  return api.get(`${BASE}/history.php`, { headers: { 'X-History-Tokens': header }, signal: opts.signal });
}
