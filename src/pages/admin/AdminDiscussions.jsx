import { useState } from 'react';
import { adminDiscussions } from '../../lib/adminApi.js';
import { DiscussionRow, LoadError, LoadingBlock, Pager, Panel, SearchBox, useAdminData, useDebounced } from './ui.jsx';

const LIMIT = 25;
const MODES = [
  ['', 'All modes'],
  ['debate', 'Debate'],
  ['collaborative', 'Collaborative'],
  ['research', 'Research'],
  ['philosophical', 'Philosophical'],
  ['problem_solving', 'Problem-Solving'],
  ['open', 'Open discussion (older)'],
];

export default function AdminDiscussions() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('');
  const [offset, setOffset] = useState(0);
  const query = useDebounced(q.trim());
  const { loading, error, data, reload } = useAdminData(
    (signal) => adminDiscussions({ q: query, mode, offset, limit: LIMIT, signal }),
    [query, mode, offset]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Discussions</h1>
        <p className="mt-1 text-sm text-muted">{data ? `${data.total} ${data.total === 1 ? 'discussion' : 'discussions'} by registered users` : 'Discussions by registered users'}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setOffset(0);
          }}
          placeholder="Search topic, name or username"
        />
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setOffset(0);
          }}
          aria-label="Filter by mode"
          className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-fg focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20"
        >
          {MODES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {loading && !data && <LoadingBlock />}
      {error && !data && <LoadError message={error} onRetry={reload} />}
      {data && (
        <Panel className={loading ? 'opacity-60 transition' : 'transition'}>
          {data.discussions.length === 0 ? (
            <p className="text-center text-sm text-muted">No discussions match.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.discussions.map((d) => (
                <DiscussionRow key={d.id} d={d} showOwner />
              ))}
            </ul>
          )}
        </Panel>
      )}
      {data && <Pager offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />}
    </div>
  );
}
