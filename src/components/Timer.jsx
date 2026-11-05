import { formatDuration } from '../lib/format.js';
import { IconClock } from './Icons.jsx';

export default function Timer({ elapsed, remaining }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums text-muted" title="Elapsed / remaining">
      <IconClock size={13} />
      <span>
        <span className="sr-only">Elapsed </span>
        {formatDuration(elapsed)}
      </span>
      <span aria-hidden="true">/</span>
      <span>
        {formatDuration(remaining)}
        <span className="ml-1">left</span>
      </span>
    </div>
  );
}
