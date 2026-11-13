import { USER_META, seatStyle } from '../lib/participants.js';

// One icon per personality. Colours come from the seat (Alpha blue, Beta purple, ...), so two AIs never look alike.
const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

function Svg({ size, children, width = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={width} {...stroke}>
      {children}
    </svg>
  );
}

const ICONS = {
  // Hexagon with an atom inside: structured, logical.
  analytical: ({ size }) => (
    <Svg size={size} width={1.6}>
      <polygon points="12 2.5 20.2 7.25 20.2 16.75 12 21.5 3.8 16.75 3.8 7.25" />
      <ellipse cx="12" cy="12" rx="5.6" ry="2.2" transform="rotate(35 12 12)" />
      <ellipse cx="12" cy="12" rx="5.6" ry="2.2" transform="rotate(-35 12 12)" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  ),
  // Crescent moon with a small star: reflective.
  philosophical: ({ size }) => (
    <Svg size={size}>
      <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z" />
      <path d="M16 5.5c1.2 0 2 .8 2 1.9s-.9 1.8-1.8 1.6" />
      <circle cx="16.4" cy="7.4" r="0.7" fill="currentColor" stroke="none" />
    </Svg>
  ),
  // Magnifying glass over a crossed-out line: finds weak spots.
  critical: ({ size }) => (
    <Svg size={size}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
      <path d="M8 10.5h5" />
    </Svg>
  ),
  // Light bulb with rays: new ideas.
  creative: ({ size }) => (
    <Svg size={size}>
      <path d="M9 17.5h6M10 20.5h4" />
      <path d="M12 3.5a5.5 5.5 0 0 0-3.3 9.9c.6.5 1 1.2 1.1 2h4.4c.1-.8.5-1.5 1.1-2A5.5 5.5 0 0 0 12 3.5z" />
      <path d="M3 9.5h1.5M19.5 9.5H21M5.2 4.2l1 1M18.8 4.2l-1 1" />
    </Svg>
  ),
  // Lab flask: evidence and experiments.
  scientific: ({ size }) => (
    <Svg size={size}>
      <path d="M9.5 3.5h5M10.5 3.5v5.2L5.2 18a1.8 1.8 0 0 0 1.6 2.5h10.4a1.8 1.8 0 0 0 1.6-2.5l-5.3-9.3V3.5" />
      <path d="M7.5 14.5h9" />
    </Svg>
  ),
  // Question mark in a speech bubble: "how do we know?".
  skeptical: ({ size }) => (
    <Svg size={size}>
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
      <path d="M10 9.6a2.1 2.1 0 1 1 3 1.9c-.6.3-1 .8-1 1.4v.4" />
      <circle cx="12" cy="15.8" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  ),
  // Balance scale: neutral moderator.
  moderator: ({ size }) => (
    <Svg size={size}>
      <path d="M12 3.5v17M7.5 20.5h9M5 6.5h14" />
      <path d="M5 6.5l-2.5 6a2.5 2.5 0 0 0 5 0L5 6.5zM19 6.5l-2.5 6a2.5 2.5 0 0 0 5 0L19 6.5z" />
    </Svg>
  ),
  // Sparkle: a personality the user created.
  custom: ({ size }) => (
    <Svg size={size}>
      <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1-5.1-1.9 5.1-1.9z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </Svg>
  ),
  user: ({ size }) => (
    <Svg size={size} width={1.8}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.8 3.1-6.3 7-6.3s7 2.5 7 6.3" />
    </Svg>
  ),
};

const LEGACY_ICON = { alpha: 'analytical', beta: 'philosophical', gamma: 'moderator', user: 'user' };

/**
 * Circular identity avatar. Pass `meta` (from lib/participants.js), or just `who` for the
 * legacy keys ('alpha', 'beta', 'user'). When `speaking`, two soft rings pulse outwards.
 */
export default function Avatar({ meta, who, icon, size = 40, speaking = false }) {
  const key = meta ? meta.key : who || 'user';
  const style = meta ? meta.style : key === 'user' ? USER_META.style : seatStyle(key);
  const iconKey = icon || (meta && meta.icon) || LEGACY_ICON[key] || 'custom';
  const Icon = ICONS[iconKey] || ICONS.custom;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {speaking && (
        <>
          <span className={`absolute inset-0 rounded-full border-2 ${style.borderStrong} animate-ring`} />
          <span className={`absolute inset-0 rounded-full border-2 ${style.borderStrong} animate-ring`} style={{ animationDelay: '0.8s' }} />
        </>
      )}
      <span className={`relative flex h-full w-full items-center justify-center rounded-full border ${style.border} ${style.soft} ${style.text}`}>
        <Icon size={Math.round(size * 0.58)} />
      </span>
    </span>
  );
}
