import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { IconLogOut, IconSpinner } from '../../components/Icons.jsx';
import { ADMIN_LOGOUT_EVENT, adminLogin, getAdminToken, setAdminToken } from '../../lib/adminApi.js';
import { friendlyError } from '../../lib/format.js';
import AdminDashboard from './AdminDashboard.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminUser from './AdminUser.jsx';
import AdminDiscussions from './AdminDiscussions.jsx';
import AdminDiscussion from './AdminDiscussion.jsx';

function AdminLogin({ onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Enter the admin password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await adminLogin(password);
      setAdminToken(res);
      onLoggedIn();
    } catch (err) {
      setError(err.code === 'invalid_credentials' ? 'Wrong admin password.' : friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-bold text-fg">Admin panel</h1>
          <p className="mt-1 text-sm text-muted">Enter the admin password from the server settings.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5" noValidate>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-fg">
              Admin password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-fg focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-fg" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-alpha text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60">
            {busy && <IconSpinner size={16} />}
            {busy ? 'Checking…' : 'Log in'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">The admin session ends after 8 hours or when you close this tab.</p>
      </div>
    </main>
  );
}

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/discussions', label: 'Discussions' },
];

function navCls({ isActive }) {
  return `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-alpha/10 text-alpha' : 'text-muted hover:bg-surface-2 hover:text-fg'}`;
}

/** The /admin area: its own login, layout and pages. Only registered users' data is ever shown. */
export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getAdminToken()));
  const navigate = useNavigate();

  // Keep the admin area out of search engines and show its own title.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'Admin | ThinkTogether';
    const onLogout = () => setLoggedIn(false);
    window.addEventListener(ADMIN_LOGOUT_EVENT, onLogout);
    return () => {
      meta.remove();
      document.title = 'ThinkTogether';
      window.removeEventListener(ADMIN_LOGOUT_EVENT, onLogout);
    };
  }, []);

  if (!loggedIn) return <AdminLogin onLoggedIn={() => setLoggedIn(true)} />;

  const logout = () => {
    setAdminToken(null);
    setLoggedIn(false);
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-safe backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Logo compact />
            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={logout} aria-label="Log out of admin" className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-fg transition hover:bg-surface-2">
              <IconLogOut size={15} />
              <span className="hidden sm:inline">Log out</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Admin sections">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-16 pt-6">
        <nav className="hidden w-48 shrink-0 flex-col gap-1 lg:flex" aria-label="Admin sections">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>
              {n.label}
            </NavLink>
          ))}
          <p className="mt-4 px-3 text-xs leading-relaxed text-muted">Read-only view of registered users. Guest discussions are never shown here.</p>
        </nav>
        <main className="min-w-0 flex-1">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUser />} />
            <Route path="discussions" element={<AdminDiscussions />} />
            <Route path="discussions/:id" element={<AdminDiscussion />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
