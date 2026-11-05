import { useState } from 'react';
import Logo from './Logo.jsx';
import StatusBadge from './StatusBadge.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import Timer from './Timer.jsx';
import { IconChevronDown } from './Icons.jsx';

export default function RoomHeader({ discussion, clock }) {
  const [expanded, setExpanded] = useState(false);
  const total = discussion ? discussion.duration_seconds : 0;
  const pct = discussion && total > 0 ? Math.min(100, Math.max(0, (clock.elapsed / total) * 100)) : 0;

  return (
    <div>
      <div className="flex h-12 items-center justify-between gap-2">
        <Logo compact />
        <div className="flex items-center gap-2">
          {discussion && <StatusBadge status={discussion.status} />}
          <ThemeToggle />
        </div>
      </div>
      {discussion && (
        <>
          <div className="flex items-start justify-between gap-3 pb-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="group flex min-w-0 flex-1 items-start gap-1.5 text-left"
              aria-expanded={expanded}
              title={expanded ? 'Collapse topic' : 'Show full topic'}
            >
              <span className={`min-w-0 text-sm font-medium leading-snug text-fg ${expanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                {discussion.topic}
              </span>
              <IconChevronDown size={15} className={`mt-0.5 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <div className="pt-0.5">
              <Timer elapsed={clock.elapsed} remaining={clock.remaining} />
            </div>
          </div>
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Discussion progress">
            <div className="h-full rounded-full bg-gradient-to-r from-alpha to-beta transition-[width] duration-700 ease-linear" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
