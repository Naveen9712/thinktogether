import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { IconPlay, IconSpinner } from './Icons.jsx';
import { continueDiscussion } from '../lib/api.js';
import { friendlyError } from '../lib/format.js';
import { radioKeyDown } from '../lib/radio.js';

const EXTRA = [5, 10, 15, 30];
const QUESTION_MAX = 4000;

/**
 * "Resume conversation": the same discussion continues with all its history. The user picks extra time and can
 * ask a new question to start with. Calls onResumed(discussion) on success.
 */
export default function ResumeDialog({ open, discussionId, topic, onClose, onResumed }) {
  const [minutes, setMinutes] = useState(10);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMinutes(10);
      setQuestion('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await continueDiscussion(discussionId, minutes, question);
      onResumed(res.discussion);
    } catch (err) {
      const fields = err.details && err.details.fields;
      setError(fields ? Object.values(fields).join(' ') : friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Resume conversation"
      subtitle="The AIs continue this same discussion and remember everything said so far."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="submit"
            form="resume-form"
            disabled={busy || question.length > QUESTION_MAX}
            className="flex items-center justify-center gap-2 rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <IconSpinner size={16} /> : <IconPlay size={16} />}
            {busy ? 'Resuming…' : 'Resume conversation'}
          </button>
        </>
      }
    >
      <form id="resume-form" onSubmit={submit} className="space-y-5">
        {topic && <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-fg">{topic}</p>}
        <div>
          <p id="resume-time-label" className="mb-2 text-sm font-semibold text-fg">
            How much more time?
          </p>
          <div
            role="radiogroup"
            aria-labelledby="resume-time-label"
            className="grid grid-cols-4 gap-2"
            onKeyDown={(e) => radioKeyDown(e, EXTRA, minutes, setMinutes)}
          >
            {EXTRA.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minutes === m}
                tabIndex={minutes === m ? 0 : -1}
                data-autofocus={minutes === m ? 'true' : undefined}
                onClick={() => setMinutes(m)}
                className={`h-11 rounded-xl border text-sm font-semibold transition ${
                  minutes === m ? 'border-alpha bg-alpha/15 text-alpha' : 'border-line bg-surface text-muted hover:text-fg'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor="resume-question" className="text-sm font-semibold text-fg">
              Ask a new question
            </label>
            <span className="text-xs text-muted">Optional</span>
          </div>
          <textarea
            id="resume-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            maxLength={QUESTION_MAX}
            placeholder="For example: What about people in small towns? Or leave empty to continue where it stopped."
            className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-fg placeholder:text-muted focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20"
          />
        </div>
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-fg" role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
