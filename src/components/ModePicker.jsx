import { radioKeyDown } from '../lib/radio.js';

const ICON_PROPS = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const MODE_ICONS = {
  // Two opposing arrows.
  debate: (
    <svg {...ICON_PROPS}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  ),
  // Linked rings.
  collaborative: (
    <svg {...ICON_PROPS}>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </svg>
  ),
  // Magnifier over lines.
  research: (
    <svg {...ICON_PROPS}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5M8 9h5M8 12h3" />
    </svg>
  ),
  // Moon and star.
  philosophical: (
    <svg {...ICON_PROPS}>
      <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z" />
    </svg>
  ),
  // Wrench.
  problem_solving: (
    <svg {...ICON_PROPS}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.5-.5-.5-2.5z" />
    </svg>
  ),
};

/** Discussion mode cards (keyboard: arrow keys move the selection). */
export default function ModePicker({ modes, value, onChange, error }) {
  const keys = modes.map((m) => m.key);
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Discussion mode"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        onKeyDown={(e) => radioKeyDown(e, keys, value, onChange)}
      >
        {modes.map((m) => {
          const on = value === m.key;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(m.key)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                on ? 'border-alpha bg-alpha/10' : 'border-line bg-surface hover:border-alpha/40'
              }`}
            >
              <span className={`mt-0.5 shrink-0 ${on ? 'text-alpha' : 'text-muted'}`}>{MODE_ICONS[m.key] || MODE_ICONS.collaborative}</span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${on ? 'text-alpha' : 'text-fg'}`}>{m.name}</span>
                <span className="mt-1 block text-xs leading-snug text-muted">{m.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
