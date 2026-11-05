import { STATUS_META } from '../lib/format.js';

export default function StatusBadge({ status, className = '' }) {
  const meta = STATUS_META[status] || STATUS_META.ended;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${meta.cls} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {meta.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
      </span>
      {meta.label}
    </span>
  );
}
