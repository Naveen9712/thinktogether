import { Link } from 'react-router-dom';

export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="12.5" cy="16" r="7" stroke="rgb(var(--alpha))" strokeWidth="2.2" />
      <circle cx="19.5" cy="16" r="7" stroke="rgb(var(--beta))" strokeWidth="2.2" />
    </svg>
  );
}

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-lg" aria-label="ThinkTogether home">
      <LogoMark size={compact ? 24 : 28} />
      <span className={`font-semibold tracking-tight text-fg ${compact ? 'text-[15px]' : 'text-base'}`}>
        Think<span className="text-muted">Together</span>
      </span>
    </Link>
  );
}
