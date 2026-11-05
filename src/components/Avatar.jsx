import { AGENTS } from '../lib/format.js';

function AlphaIcon({ size }) {
  // Hexagon with an atom (nucleus + orbit) inside.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2.5 20.2 7.25 20.2 16.75 12 21.5 3.8 16.75 3.8 7.25" />
      <ellipse cx="12" cy="12" rx="5.6" ry="2.2" transform="rotate(35 12 12)" />
      <ellipse cx="12" cy="12" rx="5.6" ry="2.2" transform="rotate(-35 12 12)" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BetaIcon({ size }) {
  // Crescent moon with a spiral-like trailing star.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z" />
      <path d="M16 5.5c1.2 0 2 .8 2 1.9s-.9 1.8-1.8 1.6" />
      <circle cx="16.4" cy="7.4" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UserIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.8 3.1-6.3 7-6.3s7 2.5 7 6.3" />
    </svg>
  );
}

const ICONS = { alpha: AlphaIcon, beta: BetaIcon, user: UserIcon };

/** Circular identity avatar. When `speaking`, two soft rings pulse outwards. */
export default function Avatar({ who, size = 40, speaking = false }) {
  const meta = AGENTS[who] || AGENTS.user;
  const Icon = ICONS[who] || UserIcon;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {speaking && (
        <>
          <span className={`absolute inset-0 rounded-full border-2 ${meta.borderStrong} animate-ring`} />
          <span className={`absolute inset-0 rounded-full border-2 ${meta.borderStrong} animate-ring`} style={{ animationDelay: '0.8s' }} />
        </>
      )}
      <span className={`relative flex h-full w-full items-center justify-center rounded-full border ${meta.border} ${meta.soft} ${meta.text}`}>
        <Icon size={Math.round(size * 0.58)} />
      </span>
    </span>
  );
}
