import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { IconPlus, IconTrash } from '../components/Icons.jsx';
import { getHistory } from '../lib/api.js';
import { getSessions, removeSession } from '../lib/sessions.js';
import { DEPTH_LABELS, LIVE_STATUSES, formatDate, friendlyError } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';

const MAX_SENT = 30;

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
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-danger/10 hover:text-danger"
          title="Removes it from this device only"
        >
          <IconTrash size={14} />
          Remove from this device
        </button>
      </div>
    </article>
  );
}

export default function History() {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, items: [], error: '' });

  const load = useCallback(async (signal) => {
    const sessions = getSessions();
    if (sessions.length === 0) {
      setState({ loading: false, items: [], error: '' });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: '' }));
    const sent = sessions.slice(0, MAX_SENT);
    try {
      const res = await getHistory(sent, { signal });
      const known = new Set(res.discussions.map((d) => String(d.id)));
      // The server no longer knows these discussions, so forget them on this device too.
      sent.filter((s) => !known.has(String(s.id))).forEach((s) => removeSession(s.id));
      const items = [...res.discussions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setState({ loading: false, items, error: '' });
    } catch (e) {
      if (e.code === 'ERR_CANCELED') return;
      setState({ loading: false, items: [], error: friendlyError(e) });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const remove = (id) => {
    removeSession(id);
    setState((s) => ({ ...s, items: s.items.filter((d) => d.id !== id) }));
    toast.info('Removed from this device.');
  };

  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">History</h1>
            <p className="mt-1 text-sm text-muted">Discussions started on this device.</p>
          </div>
          <Link to="/" className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2">
            <IconPlus size={16} />
            New
          </Link>
        </div>

        {state.loading && <HistorySkeleton />}

        {!state.loading && state.error && <ErrorState title="Could not load your history" message={state.error} onRetry={() => load()} />}

        {!state.loading && !state.error && state.items.length === 0 && (
          <ErrorState tone="muted" title="No discussions yet" message="Start one and it will show up here, so you can come back to the room or its summary later.">
            <Link to="/" className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
              Start a discussion
            </Link>
          </ErrorState>
        )}

        {!state.loading && !state.error && state.items.length > 0 && (
          <div className="space-y-3">
            {state.items.map((item) => (
              <Card key={item.id} item={item} onRemove={remove} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
