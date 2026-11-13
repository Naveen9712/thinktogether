import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Skeleton from '../../components/Skeleton.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ParticipantChips from '../../components/ParticipantChips.jsx';
import { DEPTH_LABELS, formatDate, friendlyError } from '../../lib/format.js';

/** Loads admin data with loading / error / reload. `fn(signal)` must return a promise. */
export function useAdminData(fn, deps) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller lists what `fn` depends on
  const load = useCallback(fn, deps);

  const run = useCallback(
    async (signal) => {
      setState((s) => ({ ...s, loading: true, error: '' }));
      try {
        const data = await load(signal);
        setState({ loading: false, error: '', data });
      } catch (e) {
        if (e.code === 'ERR_CANCELED') return;
        setState((s) => ({ ...s, loading: false, error: friendlyError(e) }));
      }
    },
    [load]
  );

  useEffect(() => {
    const controller = new AbortController();
    run(controller.signal);
    return () => controller.abort();
  }, [run]);

  return { ...state, reload: () => run() };
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** A headline number. Text stays in ink colours; the label says what it counts. */
export function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-fg">{Number(value || 0).toLocaleString()}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Ranked counts as thin horizontal bars: one series, one hue, sorted, each value labelled in text ink.
 * Bars start at zero and are scaled to the largest count.
 */
export function BarList({ items, emptyText = 'No data yet.' }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.name} title={`${i.name}: ${i.count}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-fg">{i.name}</span>
            <span className="shrink-0 tabular-nums text-muted">{i.count}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full bg-alpha" style={{ width: `${Math.max(2, (i.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LoadingBlock({ rows = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-3 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function LoadError({ message, onRetry }) {
  return <ErrorState title="Could not load this page" message={message} onRetry={onRetry} />;
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-muted focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20 sm:max-w-xs"
    />
  );
}

/** Debounced copy of a value (for search boxes). */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Pager({ offset, limit, total, onChange }) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <button type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))} className="rounded-xl border border-line px-3 py-2 font-medium text-fg transition hover:bg-surface-2 disabled:opacity-40">
        Previous
      </button>
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      <button type="button" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)} className="rounded-xl border border-line px-3 py-2 font-medium text-fg transition hover:bg-surface-2 disabled:opacity-40">
        Next
      </button>
    </div>
  );
}

/** One discussion in an admin list. */
export function DiscussionRow({ d, showOwner = false }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/admin/discussions/${d.id}`} className="min-w-0 break-words text-[15px] font-semibold leading-snug text-fg hover:text-alpha hover:underline">
          {d.topic}
        </Link>
        <StatusBadge status={d.status} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {formatDate(d.created_at)} · {d.mode_name} · {DEPTH_LABELS[d.discussion_depth] || d.discussion_depth} · {d.message_count} messages
        {d.resume_count > 0 ? ` · resumed ${d.resume_count}×` : ''}
        {showOwner && d.owner && (
          <>
            {' · by '}
            <Link to={`/admin/users/${d.owner.id}`} className="font-medium text-fg hover:underline">
              {d.owner.name} (@{d.owner.username})
            </Link>
          </>
        )}
      </p>
      <ParticipantChips participants={d.participants} />
    </li>
  );
}
