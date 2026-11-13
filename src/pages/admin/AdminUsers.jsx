import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminUsers } from '../../lib/adminApi.js';
import { formatDate } from '../../lib/format.js';
import { LoadError, LoadingBlock, Pager, SearchBox, useAdminData, useDebounced } from './ui.jsx';

const LIMIT = 25;

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const query = useDebounced(q.trim());
  const { loading, error, data, reload } = useAdminData((signal) => adminUsers({ q: query, offset, limit: LIMIT, signal }), [query, offset]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Users</h1>
          <p className="mt-1 text-sm text-muted">{data ? `${data.total} registered ${data.total === 1 ? 'user' : 'users'}` : 'Registered users'}</p>
        </div>
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setOffset(0);
          }}
          placeholder="Search name or username"
        />
      </div>

      {loading && !data && <LoadingBlock />}
      {error && !data && <LoadError message={error} onRetry={reload} />}
      {data && data.users.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No users match your search.</p>}
      {data && data.users.length > 0 && (
        <div className={`overflow-hidden rounded-2xl border border-line bg-surface transition ${loading ? 'opacity-60' : ''}`}>
          {/* Table on larger screens, cards on phones. */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
                <th className="px-4 py-3 text-right font-semibold">Discussions</th>
                <th className="px-4 py-3 text-right font-semibold">Personalities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <Link to={`/admin/users/${u.id}`} className="font-semibold text-fg hover:text-alpha hover:underline">
                      {u.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">@{u.username}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-muted">{u.last_login_at ? formatDate(u.last_login_at) : 'Never'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{u.discussion_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg">{u.personality_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line md:hidden">
            {data.users.map((u) => (
              <li key={u.id}>
                <Link to={`/admin/users/${u.id}`} className="block px-4 py-3 hover:bg-surface-2/60">
                  <span className="block font-semibold text-fg">{u.name}</span>
                  <span className="block text-xs text-muted">
                    @{u.username} · joined {formatDate(u.created_at)}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {u.discussion_count} discussions · {u.personality_count} personalities
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data && <Pager offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />}
    </div>
  );
}
