import axios from 'axios';

// Admin panel API. A separate client: it never sends the user's login, only the admin token, which is kept
// in sessionStorage (gone when the tab closes) and expires after 8 hours on the server.
const KEY = 'tt_admin';
export const ADMIN_LOGOUT_EVENT = 'tt:admin-logout';

export function getAdminToken() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (v && v.token && Date.parse(v.expires_at) > Date.now()) return v.token;
  } catch {
    // Storage blocked or corrupt: treat as logged out.
  }
  return null;
}

export function setAdminToken(value) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the admin login lasts only for this page view.
  }
}

const admin = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

admin.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers['X-Admin-Token'] = token;
  }
  return config;
});

admin.interceptors.response.use(
  (res) => {
    if (res.data && res.data.ok === false) {
      const err = new Error(res.data.error?.message || 'Request failed');
      err.code = res.data.error?.code;
      err.status = res.status;
      return Promise.reject(err);
    }
    return res.data?.data ?? res.data;
  },
  (error) => {
    const apiErr = error.response?.data?.error;
    const err = new Error(apiErr?.message || (error.response ? `Server error (${error.response.status}).` : 'Cannot reach the server.'));
    err.code = apiErr?.code || error.code;
    err.status = error.response?.status;
    if (err.code === 'admin_auth_required') {
      setAdminToken(null);
      window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT));
    }
    return Promise.reject(err);
  }
);

export const adminLogin = (password) => admin.post('/admin/login.php', { password });
export const adminStats = (opts = {}) => admin.get('/admin/stats.php', { signal: opts.signal });
export const adminUsers = ({ q = '', offset = 0, limit = 25, signal } = {}) => admin.get('/admin/users.php', { params: { q, offset, limit }, signal });
export const adminUser = (id, opts = {}) => admin.get('/admin/user.php', { params: { id }, signal: opts.signal });
export const adminDiscussions = ({ q = '', mode = '', offset = 0, limit = 25, signal } = {}) =>
  admin.get('/admin/discussions.php', { params: { q, mode, offset, limit }, signal });
export const adminDiscussion = (id, opts = {}) => admin.get('/admin/discussion.php', { params: { id }, signal: opts.signal });
