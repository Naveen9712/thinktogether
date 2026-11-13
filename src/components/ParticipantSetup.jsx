import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import Modal from './Modal.jsx';
import { IconCheck, IconChevronDown, IconPlus } from './Icons.jsx';
import { SEAT_KEYS, SEAT_NAMES, seatStyle, stanceLabel } from '../lib/participants.js';
import { radioKeyDown } from '../lib/radio.js';

/** Debate sides alternate by seat: Alpha for, Beta against, Delta for, ... */
export function stanceForSeat(mode, index) {
  return mode === 'debate' ? (index % 2 === 0 ? 'for' : 'against') : null;
}

function PersonalityOption({ p, seatKey, selected, usedBy, onPick }) {
  const disabled = Boolean(usedBy) && !selected;
  return (
    <button
      type="button"
      onClick={() => onPick(p.ref)}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
        selected ? 'border-alpha bg-alpha/10' : disabled ? 'cursor-not-allowed border-line bg-surface opacity-50' : 'border-line bg-surface hover:border-alpha/40'
      }`}
    >
      <Avatar meta={{ key: seatKey, style: seatStyle(seatKey), icon: p.icon }} size={36} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg">{p.name}</span>
          {p.kind === 'custom' && <span className="shrink-0 rounded-full border border-line px-1.5 text-[10px] font-semibold uppercase text-muted">Yours</span>}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">{p.description}</span>
        {disabled && <span className="mt-1 block text-[11px] font-medium text-muted">Already chosen for {usedBy}</span>}
      </span>
      {selected && <IconCheck size={18} className="mt-0.5 shrink-0 text-alpha" />}
    </button>
  );
}

function PickerDialog({ open, seatIndex, seats, builtin, custom, isLoggedIn, onPick, onClose }) {
  const seatKey = SEAT_KEYS[seatIndex] || 'alpha';
  const current = seats[seatIndex];
  const usedBy = (ref) => {
    const i = seats.findIndex((r, j) => r === ref && j !== seatIndex);
    return i === -1 ? null : SEAT_NAMES[i];
  };
  const pick = (ref) => {
    onPick(seatIndex, ref);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Personality for ${SEAT_NAMES[seatIndex] || 'this AI'}`} subtitle="Each AI needs a different personality, so their answers stay different." wide>
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Built-in personalities</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {builtin.map((p) => (
              <PersonalityOption key={p.ref} p={p} seatKey={seatKey} selected={current === p.ref} usedBy={usedBy(p.ref)} onPick={pick} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Your personalities</h3>
          {custom.length > 0 && (
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {custom.map((p) => (
                <PersonalityOption key={p.ref} p={p} seatKey={seatKey} selected={current === p.ref} usedBy={usedBy(p.ref)} onPick={pick} />
              ))}
            </div>
          )}
          {isLoggedIn ? (
            <Link to="/personalities?new=1&back=/" className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line p-3 text-sm font-semibold text-alpha transition hover:bg-surface-2">
              <IconPlus size={16} />
              {custom.length > 0 ? 'Create another personality' : 'Create your own personality'}
            </Link>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-3 text-center text-sm text-muted">
              <Link to="/login?next=/personalities" className="font-semibold text-alpha hover:underline">
                Log in
              </Link>{' '}
              to create and save your own AI personalities.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Number of AI participants (2..max), a personality per seat, and the always-present moderator Gamma.
 * `seats` is the list of personality refs ("analytical", "custom:12"), one per participant.
 */
export default function ParticipantSetup({ options, seats, onCountChange, onPick, mode, isLoggedIn, error }) {
  const [pickerFor, setPickerFor] = useState(null);
  const counts = [];
  for (let n = options.min_participants; n <= options.max_participants; n += 1) counts.push(n);
  const all = [...options.builtin, ...options.custom];
  const find = (ref) => all.find((p) => p.ref === ref);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span id="count-label" className="mr-1 text-sm text-muted">
          How many AIs?
        </span>
        <div role="radiogroup" aria-labelledby="count-label" className="flex gap-2" onKeyDown={(e) => radioKeyDown(e, counts, seats.length, onCountChange)}>
          {counts.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={seats.length === n}
              tabIndex={seats.length === n ? 0 : -1}
              onClick={() => onCountChange(n)}
              className={`h-10 w-11 rounded-xl border text-sm font-semibold transition ${
                seats.length === n ? 'border-alpha bg-alpha/15 text-alpha' : 'border-line bg-surface text-muted hover:text-fg'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {seats.map((ref, i) => {
          const p = find(ref);
          const key = SEAT_KEYS[i];
          const style = seatStyle(key);
          const stance = stanceForSeat(mode, i);
          return (
            <li key={key} className="min-w-0">
              <button
                type="button"
                onClick={() => setPickerFor(i)}
                className={`flex w-full items-center gap-3 rounded-2xl border ${style.border} bg-surface p-3 text-left transition hover:bg-surface-2`}
                aria-label={`${SEAT_NAMES[i]}: ${p ? p.name : 'choose a personality'}. Change personality`}
              >
                <Avatar meta={{ key, style, icon: p ? p.icon : 'custom' }} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${style.text}`}>{SEAT_NAMES[i]}</span>
                    {stance && <span className="rounded-full border border-line bg-surface-2 px-1.5 text-[10px] font-semibold uppercase text-muted">{stanceLabel(stance)}</span>}
                  </span>
                  <span className="block truncate text-sm text-fg">{p ? p.name : 'Choose a personality'}</span>
                  {p && <span className="block truncate text-xs text-muted">{p.description}</span>}
                </span>
                <IconChevronDown size={16} className="shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-start gap-3 rounded-2xl border border-gamma/30 bg-gamma/5 p-3">
        <Avatar meta={{ key: 'gamma', style: seatStyle('gamma'), icon: 'moderator' }} size={40} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gamma">
            AI Gamma <span className="font-normal text-muted">· {options.moderator.name}</span>
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted">
            Joins every discussion. Opens it, keeps it on track after each round, makes sure every AI speaks, challenges weak arguments and gives a fair summary at the end.
          </p>
        </div>
      </div>

      {mode === 'debate' && <p className="text-xs text-muted">In a debate, the AIs take turns arguing For and Against. Gamma stays neutral.</p>}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      <PickerDialog
        open={pickerFor !== null}
        seatIndex={pickerFor ?? 0}
        seats={seats}
        builtin={options.builtin}
        custom={options.custom}
        isLoggedIn={isLoggedIn}
        onPick={onPick}
        onClose={() => setPickerFor(null)}
      />
    </div>
  );
}
