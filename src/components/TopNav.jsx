import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { IconHistory, IconLogOut } from './Icons.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from './Toast.jsx';

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initial = (user.name || user.username || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface pl-1 pr-2.5 text-sm font-medium text-fg transition hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-alpha/15 text-xs font-bold text-alpha">{initial}</span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{user.name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-56 animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-muted">@{user.username}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" to="/history" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface-2">
            <IconHistory size={16} />
            My discussions
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
          >
            <IconLogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const onAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  const doLogout = async () => {
    await logout();
    toast.info('You are logged out.');
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 pt-safe backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link
            to="/history"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-sm font-medium text-muted transition hover:text-fg sm:px-3"
            aria-label="History"
          >
            <IconHistory size={16} />
            <span className="hidden sm:inline">History</span>
          </Link>
          {user ? (
            <UserMenu user={user} onLogout={doLogout} />
          ) : (
            !onAuthPage && (
              <>
                <Link to="/login" className="flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg transition hover:bg-surface-2">
                  Log in
                </Link>
                <Link to="/signup" className="hidden h-9 items-center rounded-lg bg-alpha px-3 text-sm font-semibold text-bg transition hover:opacity-90 sm:flex">
                  Sign up
                </Link>
              </>
            )
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
