import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import MessageCard from '../../components/MessageCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ParticipantChips from '../../components/ParticipantChips.jsx';
import { adminDiscussion } from '../../lib/adminApi.js';
import { DEPTH_LABELS, formatDate } from '../../lib/format.js';
import { participantMap } from '../../lib/participants.js';
import { LoadError, LoadingBlock, Panel, useAdminData } from './ui.jsx';

function SummaryBlock({ s }) {
  const list = (title, items) =>
    items && items.length > 0 ? (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-fg">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Session {s.part} · {formatDate(s.created_at)}</p>
      {s.overview && <p className="text-sm leading-relaxed text-fg">{s.overview}</p>}
      {(s.perspectives || []).map((p) => (
        <p key={p.key} className="text-sm text-fg">
          <span className="font-semibold">{p.name}</span>
          {p.personality ? <span className="text-muted"> ({p.personality})</span> : null}: {p.text}
        </p>
      ))}
      {list('Strongest arguments', s.strongest_arguments)}
      {s.mode_outcome && list(s.mode_outcome.title, s.mode_outcome.points)}
      {list('Unanswered questions', s.unanswered_questions)}
      {s.final_conclusion && (
        <p className="whitespace-pre-wrap text-sm text-fg">
          <span className="font-semibold">Conclusion: </span>
          {s.final_conclusion}
        </p>
      )}
    </div>
  );
}

export default function AdminDiscussion() {
  const { id } = useParams();
  const { loading, error, data, reload } = useAdminData((signal) => adminDiscussion(id, { signal }), [id]);
  const participants = data ? data.discussion.participants : null;
  const metaMap = useMemo(() => participantMap({ participants }), [participants]);
  if (loading && !data) return <LoadingBlock rows={4} />;
  if (error && !data) return <LoadError message={error} onRetry={reload} />;
  const { discussion: d, owner, messages, summaries } = data;
  const humans = messages.filter((m) => m.speaker === 'user').length;

  return (
    <div className="space-y-5">
      {owner && (
        <Link to={`/admin/users/${owner.id}`} className="text-sm font-medium text-alpha hover:underline">
          ← {owner.name} (@{owner.username})
        </Link>
      )}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={d.status} />
          <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{d.mode_name}</span>
        </div>
        <h1 className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight text-fg">{d.topic}</h1>
        <p className="mt-1 text-sm text-muted">
          Started {formatDate(d.start_time)} · {d.duration_minutes} min planned · {DEPTH_LABELS[d.discussion_depth] || d.discussion_depth} · {d.turn_count} AI turns · {humans} human messages
          {d.resume_count > 0 ? ` · ${d.session} sessions` : ''}
        </p>
        {d.additional_context && <p className="mt-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-fg">Context: {d.additional_context}</p>}
        <ParticipantChips participants={d.participants} />
      </div>
      {summaries.length > 0 && (
        <Panel title={summaries.length > 1 ? `Summaries (${summaries.length} sessions)` : 'Summary'}>
          <div className="space-y-3">
            {summaries.map((s) => (
              <SummaryBlock key={s.part} s={s} />
            ))}
          </div>
        </Panel>
      )}
      <Panel title={`Complete conversation (${messages.length} messages)`}>
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No messages.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageCard key={m.id} message={m} metaMap={metaMap} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
