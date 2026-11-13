import { Link, useParams } from 'react-router-dom';
import { adminUser } from '../../lib/adminApi.js';
import { formatDate } from '../../lib/format.js';
import { BarList, DiscussionRow, LoadError, LoadingBlock, Panel, StatTile, useAdminData } from './ui.jsx';

export default function AdminUser() {
  const { id } = useParams();
  const { loading, error, data, reload } = useAdminData((signal) => adminUser(id, { signal }), [id]);
  if (loading && !data) return <LoadingBlock rows={4} />;
  if (error && !data) return <LoadError message={error} onRetry={reload} />;
  const { user, topics, modes_used: modes, personalities_used: personalities, custom_personalities: custom, discussions } = data;
  const messages = discussions.reduce((n, d) => n + d.message_count, 0);

  return (
    <div className="space-y-5">
      <Link to="/admin/users" className="text-sm font-medium text-alpha hover:underline">
        ← All users
      </Link>
      <div>
        <h1 className="break-words text-2xl font-bold tracking-tight text-fg">{user.name}</h1>
        <p className="mt-1 text-sm text-muted">
          @{user.username} · user #{user.id} · joined {formatDate(user.created_at)} · last login {user.last_login_at ? formatDate(user.last_login_at) : 'never'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Discussions" value={user.discussion_count} />
        <StatTile label="Messages in them" value={messages} />
        <StatTile label="Topics" value={topics.length} />
        <StatTile label="Own personalities" value={user.personality_count} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Topics discussed" className="lg:col-span-1">
          {topics.length === 0 ? (
            <p className="text-sm text-muted">No topics yet.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
              {topics.map((t) => (
                <li key={t.discussion_id}>
                  <Link to={`/admin/discussions/${t.discussion_id}`} className="break-words text-fg hover:text-alpha hover:underline">
                    {t.topic}
                  </Link>
                  <span className="block text-xs text-muted">{formatDate(t.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Modes used">
          <BarList items={modes} />
        </Panel>
        <Panel title="Personalities chosen">
          <BarList items={personalities} />
        </Panel>
      </div>
      {custom.length > 0 && (
        <Panel title="Their own AI personalities">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {custom.map((p) => (
              <li key={p.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-semibold text-fg">{p.name}</p>
                <p className="mt-0.5 text-muted">{p.description}</p>
                <p className="mt-2 text-xs text-muted">
                  <span className="font-semibold text-fg">Thinking:</span> {p.thinking_style}
                </p>
                <p className="mt-1 text-xs text-muted">
                  <span className="font-semibold text-fg">Behaviour:</span> {p.behaviour}
                </p>
                <p className="mt-1 text-xs text-muted">
                  <span className="font-semibold text-fg">Tone:</span> {p.tone}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel title={`Conversation history (${discussions.length})`}>
        {discussions.length === 0 ? (
          <p className="text-sm text-muted">This user has not started any discussions yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {discussions.map((d) => (
              <DiscussionRow key={d.id} d={d} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
