import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import Avatar from '../components/Avatar.jsx';
import { IconArrowRight, IconSpinner } from '../components/Icons.jsx';
import { createDiscussion } from '../lib/api.js';
import { saveSession } from '../lib/sessions.js';
import { AGENTS, DEPTHS, friendlyError } from '../lib/format.js';

const SUGGESTIONS = [
  'Is human consciousness more than brain activity?',
  'Could artificial intelligence ever become conscious?',
  'Does free will actually exist?',
  'Is our universe a simulation?',
  'What is the nature of reality?',
  'Can science explain spirituality?',
  'Will humans eventually become immortal?',
  'What makes human intelligence unique?',
];

const PRESETS = [5, 10, 15, 20, 30];
const TOPIC_MIN = 3;
const TOPIC_MAX = 500;
const CONTEXT_MAX = 2000;

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-danger">{message}</p>;
}

function Label({ htmlFor, children, hint }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">
        {children}
      </label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

function ThinkerCard({ who }) {
  const a = AGENTS[who];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border ${a.border} bg-surface p-4`}>
      <Avatar who={who} size={44} />
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${a.text}`}>{a.name}</p>
        <p className="text-xs font-medium text-muted">{a.label}</p>
        <p className="mt-1.5 text-sm leading-snug text-fg/80">{a.blurb}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [preset, setPreset] = useState(10);
  const [customMinutes, setCustomMinutes] = useState('');
  const [depth, setDepth] = useState('deep');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const isCustom = preset === 'custom';
  const minutes = isCustom ? Number(customMinutes) : preset;
  const topicLength = topic.trim().length;
  const topicValid = topicLength >= TOPIC_MIN && topicLength <= TOPIC_MAX;
  const contextValid = context.length <= CONTEXT_MAX;
  const minutesValid = Number.isInteger(minutes) && minutes >= 1 && minutes <= 120;
  const valid = topicValid && contextValid && minutesValid;

  const clearError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});
    try {
      const payload = {
        topic: topic.trim(),
        duration_minutes: minutes,
        discussion_depth: depth,
      };
      if (context.trim()) payload.additional_context = context.trim();
      const res = await createDiscussion(payload);
      saveSession({
        id: res.id,
        token: res.token,
        topic: payload.topic,
        created_at: (res.discussion && res.discussion.start_time) || new Date().toISOString(),
      });
      navigate(`/room/${res.id}`);
    } catch (err) {
      const fields = err.details && err.details.fields;
      if (err.code === 'validation_error' && fields && typeof fields === 'object') {
        setFieldErrors(fields);
        const known = ['topic', 'additional_context', 'duration_minutes', 'discussion_depth'];
        const unknown = Object.entries(fields).filter(([k]) => !known.includes(k));
        setFormError(unknown.length ? unknown.map(([, v]) => v).join(' ') : 'Please fix the highlighted fields.');
      } else {
        setFormError(friendlyError(err));
      }
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-fg placeholder:text-muted transition focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20';

  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pt-16">
        <section className="mx-auto max-w-2xl text-center animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-alpha" />
            <span className="h-1.5 w-1.5 rounded-full bg-beta" />
            Live AI-to-AI discussion
          </div>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-fg sm:text-5xl">
            Watch two minds think out loud.{' '}
            <span className="bg-gradient-to-r from-alpha to-beta bg-clip-text text-transparent">Then step in.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Pick a question and let an analytical thinker and a philosophical thinker explore it together. Interrupt, pause or add your own voice whenever you like.
          </p>
        </section>

        <section className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
          <ThinkerCard who="alpha" />
          <ThinkerCard who="beta" />
        </section>

        <form onSubmit={submit} className="mx-auto mt-10 max-w-2xl space-y-7 rounded-3xl border border-line bg-surface/60 p-5 sm:p-7" noValidate>
          <div>
            <Label htmlFor="topic" hint={`${topicLength}/${TOPIC_MAX}`}>
              What should they discuss?
            </Label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                clearError('topic');
              }}
              maxLength={TOPIC_MAX}
              rows={3}
              placeholder="Ask a big question or describe a topic…"
              className={`${inputCls} resize-y`}
              aria-invalid={Boolean(fieldErrors.topic)}
            />
            {topicLength > 0 && topicLength < TOPIC_MIN && <p className="mt-1.5 text-xs text-muted">Use at least {TOPIC_MIN} characters.</p>}
            <FieldError message={fieldErrors.topic} />
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setTopic(s);
                    clearError('topic');
                  }}
                  className={`rounded-full border px-3 py-1.5 text-left text-xs transition ${
                    topic === s ? 'border-alpha/60 bg-alpha/10 text-fg' : 'border-line bg-surface text-muted hover:border-alpha/40 hover:text-fg'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="context" hint={`Optional · ${context.length}/${CONTEXT_MAX}`}>
              Additional context
            </Label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                clearError('additional_context');
              }}
              rows={3}
              placeholder="Anything that should shape the conversation: your view, a definition, an angle to avoid…"
              className={`${inputCls} resize-y`}
              aria-invalid={Boolean(fieldErrors.additional_context) || !contextValid}
            />
            {!contextValid && <p className="mt-1.5 text-xs font-medium text-danger">Context must be {CONTEXT_MAX} characters or fewer.</p>}
            <FieldError message={fieldErrors.additional_context} />
          </div>

          <div>
            <Label htmlFor="duration-group" hint="Minutes">
              Duration
            </Label>
            <div id="duration-group" role="radiogroup" aria-label="Discussion duration" className="flex flex-wrap gap-2">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={preset === m}
                  onClick={() => {
                    setPreset(m);
                    clearError('duration_minutes');
                  }}
                  className={`h-10 min-w-[3.5rem] rounded-xl border px-4 text-sm font-semibold transition ${
                    preset === m ? 'border-alpha bg-alpha/15 text-alpha' : 'border-line bg-surface text-muted hover:text-fg'
                  }`}
                >
                  {m}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={isCustom}
                onClick={() => setPreset('custom')}
                className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${
                  isCustom ? 'border-alpha bg-alpha/15 text-alpha' : 'border-line bg-surface text-muted hover:text-fg'
                }`}
              >
                Custom
              </button>
              {isCustom && (
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  value={customMinutes}
                  onChange={(e) => {
                    setCustomMinutes(e.target.value);
                    clearError('duration_minutes');
                  }}
                  placeholder="1-120"
                  aria-label="Custom duration in minutes"
                  autoFocus
                  className="h-10 w-24 rounded-xl border border-line bg-surface px-3 text-sm text-fg focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20"
                />
              )}
            </div>
            {isCustom && customMinutes !== '' && !minutesValid && <p className="mt-1.5 text-xs font-medium text-danger">Enter a whole number from 1 to 120.</p>}
            <FieldError message={fieldErrors.duration_minutes} />
          </div>

          <div>
            <Label htmlFor="depth-group">Depth of discussion</Label>
            <div id="depth-group" role="radiogroup" aria-label="Discussion depth" className="grid gap-2.5 sm:grid-cols-3">
              {DEPTHS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={depth === d.value}
                  onClick={() => {
                    setDepth(d.value);
                    clearError('discussion_depth');
                  }}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    depth === d.value ? 'border-alpha bg-alpha/10' : 'border-line bg-surface hover:border-alpha/40'
                  }`}
                >
                  <p className={`text-sm font-semibold ${depth === d.value ? 'text-alpha' : 'text-fg'}`}>{d.title}</p>
                  <p className="mt-1 text-xs leading-snug text-muted">{d.description}</p>
                </button>
              ))}
            </div>
            <FieldError message={fieldErrors.discussion_depth} />
          </div>

          {formError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-fg" role="alert">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={!valid || submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-alpha to-beta text-[15px] font-semibold text-bg shadow-lg shadow-alpha/10 transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <IconSpinner size={18} />
                Starting…
              </>
            ) : (
              <>
                Start discussion
                <IconArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <footer className="mt-10 text-center text-xs text-muted">
          <Link to="/setup" className="underline-offset-2 hover:text-fg hover:underline">
            Setup check
          </Link>
        </footer>
      </main>
    </div>
  );
}
