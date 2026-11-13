import { useState } from 'react';
import Modal from './Modal.jsx';
import { IconSpinner } from './Icons.jsx';
import { savePersonality } from '../lib/api.js';
import { friendlyError } from '../lib/format.js';

// Same limits as the server (api/src/Personalities.php FIELD_LIMITS).
export const FIELDS = [
  { key: 'name', label: 'Personality name', min: 2, max: 40, rows: 0, placeholder: 'e.g. Practical Teacher', help: 'A short name you will recognise.' },
  { key: 'description', label: 'Description', min: 5, max: 200, rows: 2, placeholder: 'e.g. Explains ideas with classroom examples and checks everyone understands.', help: 'Who this AI is, in one or two sentences.' },
  { key: 'thinking_style', label: 'Thinking style', min: 5, max: 500, rows: 3, placeholder: 'e.g. Breaks ideas into simple steps and always asks "how would a student see this?"', help: 'How it reasons about a topic.' },
  { key: 'behaviour', label: 'Behaviour in the discussion', min: 5, max: 500, rows: 3, placeholder: 'e.g. Builds on good ideas, gently corrects mistakes, and asks the others for real-life examples.', help: 'How it treats the other participants.' },
  { key: 'tone', label: 'Response tone', min: 2, max: 200, rows: 0, placeholder: 'e.g. Friendly, patient and encouraging', help: 'How it sounds.' },
];

const EMPTY = { name: '', description: '', thinking_style: '', behaviour: '', tone: '' };

export function validatePersonality(values) {
  const errors = {};
  FIELDS.forEach((f) => {
    const len = (values[f.key] || '').trim().length;
    if (len < f.min || len > f.max) errors[f.key] = `Use ${f.min} to ${f.max} characters.`;
  });
  return errors;
}

/** Form values for an existing personality (edit), a built-in to customise, or a blank one. */
function startValues(initial) {
  const base = initial || {};
  return {
    name: base.id ? base.name : base.based_on ? `My ${base.name}`.slice(0, 40) : '',
    description: base.description || '',
    thinking_style: base.thinking_style || '',
    behaviour: base.behaviour || '',
    tone: base.tone || '',
  };
}

/**
 * Create or edit one of the user's personalities. `initial` = an existing personality (edit), a built-in to
 * customise (`based_on` set, no id), or null for a blank one. Calls onSaved(personality).
 */
export default function PersonalityForm({ open, initial, onClose, onSaved }) {
  const editing = Boolean(initial && initial.id);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  // Which opening the fields were filled for. Refilling during render (not in an effect) means the dialog
  // never shows a frame of empty fields when it opens.
  const [filledFor, setFilledFor] = useState(null);

  const opening = open ? initial || 'blank' : null;
  if (opening !== filledFor) {
    setFilledFor(opening);
    if (open) {
      setValues(startValues(initial));
      setErrors({});
      setFormError('');
      setBusy(false);
    }
  }

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validatePersonality(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const payload = Object.fromEntries(FIELDS.map((f) => [f.key, values[f.key].trim()]));
      if (editing) payload.id = initial.id;
      if (!editing && initial && initial.based_on) payload.based_on = initial.based_on;
      const res = await savePersonality(payload);
      onSaved(res.personality, editing);
    } catch (err) {
      if (err.code === 'validation_error' && err.details?.fields) setErrors(err.details.fields);
      else setFormError(friendlyError(err));
      setBusy(false);
    }
  };

  const title = editing ? 'Edit personality' : initial && initial.based_on ? `Customise ${initial.name}` : 'Create a personality';
  const inputCls =
    'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-fg placeholder:text-muted focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20 aria-[invalid=true]:border-danger/60';

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      wide
      title={title}
      subtitle="Describe how this AI thinks and talks. It is saved to your account and only you can use it."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" form="personality-form" disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60">
            {busy && <IconSpinner size={16} />}
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save personality'}
          </button>
        </>
      }
    >
      <form id="personality-form" onSubmit={submit} className="space-y-4" noValidate>
        {FIELDS.map((f, i) => {
          const id = `pf-${f.key}`;
          const value = values[f.key];
          const props = {
            id,
            value,
            onChange: set(f.key),
            maxLength: f.max,
            placeholder: f.placeholder,
            'aria-invalid': Boolean(errors[f.key]),
            'aria-describedby': `${id}-help`,
            'data-autofocus': i === 0 ? 'true' : undefined,
            className: `${inputCls} ${f.rows ? 'resize-y' : ''}`,
          };
          return (
            <div key={f.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-sm font-semibold text-fg">
                  {f.label}
                </label>
                <span className="text-xs tabular-nums text-muted">
                  {value.length}/{f.max}
                </span>
              </div>
              {f.rows ? <textarea rows={f.rows} {...props} /> : <input type="text" {...props} />}
              <p id={`${id}-help`} className={`mt-1 text-xs ${errors[f.key] ? 'font-medium text-danger' : 'text-muted'}`}>
                {errors[f.key] || f.help}
              </p>
            </div>
          );
        })}
        {formError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-fg" role="alert">
            {formError}
          </div>
        )}
      </form>
    </Modal>
  );
}
