import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { IconPlus, IconSpinner, IconTrash } from '../components/Icons.jsx';
import { getAccountHistory, getDeviceHistory } from '../lib/api.js';
import { MAX_SESSIONS, getSessions, removeSession } from '../lib/sessions.js';
import { DEPTH_LABELS, LIVE_STATUSES, formatDate, friendlyError } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

const PAGE_SIZE = 50;

function HistorySkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading history">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-3 h-3 w-1/2" />
          <Skeleton className="mt-4 h-9 w-32" />
        </div>
      ))}
    </div>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-danger/10 hover:text-danger"
      title="Removes it from this device only"
    >
      <IconTrash size={14} />
      Remove from this device
    </button>
  );
}

function Card({ item, onRemove }) {
  const live = LIVE_STATUSES.includes(item.status);
  return (
    <article className="animate-fade-up rounded-2xl border border-line bg-surface p-4 transition hover:border-alpha/30">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-[15px] font-semibold leading-snug text-fg">{item.topic}</h2>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {formatDate(item.created_at)} · {item.duration_minutes} min · {DEPTH_LABELS[item.discussion_depth] || item.discussion_depth} · {item.message_count}{' '}
        {item.message_count === 1 ? 'message' : 'messages'}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {live ? (
          <Link to={`/room/${item.id}`} className="rounded-xl bg-alpha px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90">
            Open room
          </Link>
        ) : (
          <Link to={`/summary/${item.id}`} className="rounded-xl bg-alpha px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90">
            View summary
          </Link>
        )}
        {onRemove && <RemoveButton onClick={() => onRemove(item.id)} />}
      </div>
    </article>
  );
}

/** A discussion this device remembers but the server did not return. Never deleted automatically. */
function UnavailableCard({ session, onRemove }) {
  return (
    <article className="rounded-2xl border border-dashed border-line bg-surface/50 p-4">
      <h2 className="break-words text-[15px] font-semibold leading-snug text-muted">{session.topic || `Discussion #${session.id}`}</h2>
      <p className="mt-2 text-xs text-muted">
        Not available right now. It may have moved into an account, or been removed from the server.
      </p>
      <div className="mt-3 flex">
        <RemoveButton onClick={() => onRemove(session.id)} />
      </div>
    </article>
  );
}

function AccountHistory() {
  const [state, setState] = useState({ loading: true, items: [], total: 0, error: '', more: false });

  const load = useCallback(async (offset = 0, signal) => {
    setState((s) => ({ ...s, loading: offset === 0, more: offset > 0, error: '' }));
    try {
      const res = await getAccountHistory({ offset, limit: PAGE_SIZE, signal });
      setState((s) => ({
        loading: false,
        more: false,
        error: '',
        total: res.total,
        items: offset === 0 ? res.discussions : [...s.items, ...res.discussions],
      }));
    } catch (e) {
      if (e.code === 'ERR_CANCELED') return;
      setState((s) => ({ ...s, loading: false, more: false, error: friendlyError(e) }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(0, controller.signal);
    return () => controller.abort();
  }, [load]);

  if (state.loading) return <HistorySkeleton />;
  if (state.error && state.items.length === 0) return <ErrorState title="Could not load your discussions" message={state.error} onRetry={() => load(0)} />;
  if (state.items.length === 0) {
    return (
      <ErrorState tone="muted" title="No discussions yet" message="Start one and it will be saved here in your account, so you can open it from any device.">
        <Link to="/" className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
          Start a discussion
        </Link>
      </ErrorState>
    );
  }
  return (
    <div className="space-y-3">
      {state.items.map((item) => (
        <Card key={item.id} item={item} />
      ))}
      {state.items.length < state.total && (
        <button
          type="button"
          onClick={() => load(state.items.length)}
          disabled={state.more}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-fg transition hover:bg-surface-2 disabled:opacity-60"
        >
          {state.more && <IconSpinner size={16} />}
          Show older discussions
        </button>
      )}
      {state.error && <p className="text-center text-sm text-danger">{state.error}</p>}
    </div>
  );
}

function DeviceHistory() {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, items: [], unavailable: [], error: '' });

  const load = useCallback(async (signal) => {
    const sessions = getSessions().slice(0, MAX_SESSIONS);
    if (sessions.length === 0) {
      setState({ loading: false, items: [], unavailable: [], error: '' });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await getDeviceHistory(sessions, { signal });
      const missing = new Set((res.missing || []).map(String));
      setState({
        loading: false,
        error: '',
        items: res.discussions,
        unavailable: sessions.filter((s) => missing.has(String(s.id))),
      });
    } catch (e) {
      if (e.code === 'ERR_CANCELED') return;
      setState({ loading: false, items: [], unavailable: [], error: friendlyError(e) });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const remove = (id) => {
    removeSession(id);
    setState((s) => ({
      ...s,
      items: s.items.filter((d) => String(d.id) !== String(id)),
      unavailable: s.unavailable.filter((d) => String(d.id) !== String(id)),
    }));
    toast.info('Removed from this device.');
  };

  if (state.loading) return <HistorySkeleton />;
  if (state.error) return <ErrorState title="Could not load your history" message={state.error} onRetry={() => load()} />;
  if (state.items.length === 0 && state.unavailable.length === 0) {
    return (
      <ErrorState tone="muted" title="No discussions yet" message="Start one and it will show up here, so you can come back to the room or its summary later.">
        <Link to="/" className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
          Start a discussion
        </Link>
      </ErrorState>
    );
  }
  return (
    <div className="space-y-3">
      {state.items.map((item) => (
        <Card key={item.id} item={item} onRemove={remove} />
      ))}
      {state.unavailable.map((s) => (
        <UnavailableCard key={s.id} session={s} onRemove={remove} />
      ))}
    </div>
  );
}

export default function History() {
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    document.title = 'History | ThinkTogether';
    return () => {
      document.title = 'ThinkTogether';
    };
  }, []);

  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{isLoggedIn ? 'My discussions' : 'History'}</h1>
            <p className="mt-1 text-sm text-muted">
              {isLoggedIn ? `Everything saved in ${user.name}'s account. Only you can see these.` : 'Discussions started on this device as a guest.'}
            </p>
          </div>
          <Link to="/" className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2">
            <IconPlus size={16} />
            New
          </Link>
        </div>

        {!isLoggedIn && (
          <p className="mb-5 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-muted">
            <Link to="/login?next=/history" className="font-semibold text-alpha hover:underline">
              Log in
            </Link>{' '}
            or{' '}
            <Link to="/signup?next=/history" className="font-semibold text-alpha hover:underline">
              create an account
            </Link>{' '}
            to keep these discussions in your account and open them on any device.
          </p>
        )}

        {isLoggedIn ? <AccountHistory key={user.id} /> : <DeviceHistory />}
      </main>
    </div>
  );
}
