import { Link } from 'react-router-dom';
import { adminStats } from '../../lib/adminApi.js';
import { formatDate } from '../../lib/format.js';
import { BarList, DiscussionRow, LoadError, LoadingBlock, Panel, StatTile, useAdminData } from './ui.jsx';

export default function AdminDashboard() {
  const { loading, error, data, reload } = useAdminData((signal) => adminStats({ signal }), []);
  if (loading && !data) return <LoadingBlock rows={4} />;
  if (error && !data) return <LoadError message={error} onRetry={reload} />;
  const s = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Registered users and their discussions.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Registered users" value={s.users_total} hint={`${s.users_new_7d} new in the last 7 days`} />
        <StatTile label="Discussions" value={s.discussions_total} hint={`${s.discussions_7d} in the last 7 days`} />
        <StatTile label="Discussions today" value={s.discussions_today} hint="Since midnight (UTC)" />
        <StatTile label="Live right now" value={s.discussions_live} hint="Running, paused or waiting" />
        <StatTile label="Custom personalities" value={s.custom_personalities} hint="Created by users" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Discussion modes used">
          <BarList items={s.modes} />
        </Panel>
        <Panel title="Most chosen personalities">
          <BarList items={s.top_personalities} />
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Newest users"
          action={
            <Link to="/admin/users" className="text-sm font-medium text-alpha hover:underline">
              All users
            </Link>
          }
        >
          {s.recent_users.length === 0 ? (
            <p className="text-sm text-muted">No users yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {s.recent_users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Link to={`/admin/users/${u.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-fg hover:underline">{u.name}</span>
                    <span className="block truncate text-xs text-muted">@{u.username} · joined {formatDate(u.created_at)}</span>
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{u.discussion_count} discussions</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Latest discussions"
          action={
            <Link to="/admin/discussions" className="text-sm font-medium text-alpha hover:underline">
              All discussions
            </Link>
          }
        >
          {s.recent_discussions.length === 0 ? (
            <p className="text-sm text-muted">No discussions yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {s.recent_discussions.map((d) => (
                <DiscussionRow key={d.id} d={d} showOwner />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
