import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ErrorState from '../components/ErrorState.jsx';
import MessageCard from '../components/MessageCard.jsx';
import Skeleton, { MessageSkeletons } from '../components/Skeleton.jsx';
import Avatar from '../components/Avatar.jsx';
import ResumeDialog from '../components/ResumeDialog.jsx';
import { IconCheck, IconChevronDown, IconCopy, IconPlay, IconSpinner } from '../components/Icons.jsx';
import { metaFor, participantMap, stanceLabel } from '../lib/participants.js';
import { useToast } from '../components/Toast.jsx';
import { generateSummary, getMessages, getSummary } from '../lib/api.js';
import { getToken } from '../lib/sessions.js';
import { getAuthToken } from '../lib/auth.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { LIVE_STATUSES, friendlyError } from '../lib/format.js';

const LIST_SECTIONS = [
  { key: 'main_ideas', title: 'Main ideas explored' },
  { key: 'agreement_points', title: 'Points of agreement' },
  { key: 'disagreement_points', title: 'Points of disagreement' },
  { key: 'human_contributions', title: 'Human contributions' },
  { key: 'key_insights', title: 'Important insights' },
  { key: 'unanswered_questions', title: 'Unanswered questions' },
];

function buildPlainText(topic, s) {
  const bullets = (list) => (list && list.length ? list.map((x) => `- ${x}`).join('\n') : '- None');
  const perspectives = (s.perspectives || []).flatMap((p) => [`${p.name}${p.personality ? ` (${p.personality})` : ''}: ${p.text}`, '']);
  return [
    `ThinkTogether summary: ${topic}`,
    '',
    'OVERVIEW',
    s.overview,
    '',
    'MAIN IDEAS EXPLORED',
    bullets(s.main_ideas),
    '',
    "EACH AI'S STRONGEST ARGUMENTS",
    ...perspectives,
    'STRONGEST ARGUMENTS OF THE DISCUSSION',
    bullets(s.strongest_arguments),
    '',
    ...(s.mode_outcome ? [s.mode_outcome.title.toUpperCase(), bullets(s.mode_outcome.points), ''] : []),
    'POINTS OF AGREEMENT',
    bullets(s.agreement_points),
    '',
    'POINTS OF DISAGREEMENT',
    bullets(s.disagreement_points),
    '',
    'HUMAN CONTRIBUTIONS',
    bullets(s.human_contributions),
    '',
    'IMPORTANT INSIGHTS',
    bullets(s.key_insights),
    '',
    'UNANSWERED QUESTIONS',
    bullets(s.unanswered_questions),
    '',
    'FINAL CONCLUSION',
    s.final_conclusion,
  ].join('\n');
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

function Section({ title, children, accent = 'text-fg', className = '' }) {
  return (
    <section className={`animate-fade-up rounded-2xl border border-line bg-surface p-5 ${className}`}>
      <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accent}`}>{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted">Nothing to report here.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-fg">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
          <span className="min-w-0 whitespace-pre-wrap break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Prose({ children }) {
  return <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg">{children}</p>;
}

function SummarySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading summary">
      <Skeleton className="h-8 w-3/4" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-2xl border border-line bg-surface p-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function Transcript({ id, metaMap }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, loaded: false, error: '', messages: [] });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await getMessages(id, 0);
      setState({ loading: false, loaded: true, error: '', messages: res.messages });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: friendlyError(e) }));
    }
  }, [id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !state.loaded && !state.loading) load();
  };

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between gap-3 p-5 text-left" aria-expanded={open}>
        <span className="text-sm font-semibold uppercase tracking-wide text-fg">Full conversation</span>
        <IconChevronDown size={18} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-line p-4 sm:p-5">
          {state.loading && <MessageSkeletons count={2} />}
          {state.error && (
            <div className="text-center text-sm">
              <p className="text-danger">{state.error}</p>
              <button type="button" onClick={load} className="mt-2 font-semibold text-alpha hover:underline">
                Try again
              </button>
            </div>
          )}
          {state.loaded && state.messages.length === 0 && <p className="text-center text-sm text-muted">This discussion has no messages.</p>}
          {state.loaded && state.messages.length > 0 && (
            <div className="space-y-4">
              {state.messages.map((m) => (
                <MessageCard key={m.id} message={m} metaMap={metaMap} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** One card per AI participant with its strongest arguments. */
function Perspectives({ summary, metaMap }) {
  const items = summary.perspectives || [];
  if (items.length === 0) return null;
  return (
    <div className={`grid grid-cols-1 gap-4 ${items.length > 1 ? 'md:grid-cols-2' : ''}`}>
      {items.map((p) => {
        const meta = metaFor(metaMap, p.key);
        const st = meta.style;
        return (
          <section key={p.key} className={`animate-fade-up rounded-2xl border ${st.border} ${st.soft} p-5`}>
            <div className="mb-3 flex items-center gap-2.5">
              <Avatar meta={meta} size={30} />
              <div className="min-w-0">
                <h2 className={`text-sm font-semibold ${st.text}`}>{p.name || meta.name}</h2>
                <p className="text-xs text-muted">
                  {p.personality || meta.label}
                  {meta.stance ? ` · ${stanceLabel(meta.stance)}` : ''}
                </p>
              </div>
            </div>
            <Prose>{p.text}</Prose>
          </section>
        );
      })}
    </div>
  );
}

/** Summaries of the sessions before the current one (a resumed discussion has one per session). */
function EarlierSessions({ sessions, currentPart }) {
  const [open, setOpen] = useState(false);
  const earlier = (sessions || []).filter((s) => s.part < currentPart);
  if (earlier.length === 0) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-5 text-left" aria-expanded={open}>
        <span className="text-sm font-semibold uppercase tracking-wide text-fg">
          Earlier sessions <span className="font-normal normal-case text-muted">({earlier.length})</span>
        </span>
        <IconChevronDown size={18} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-line p-5">
          {earlier.map((s) => (
            <div key={s.part} className="rounded-xl border border-line p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Session {s.part}</p>
              {s.overview && <p className="mt-2 text-sm leading-relaxed text-fg">{s.overview}</p>}
              {s.final_conclusion && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  <span className="font-semibold text-fg">Conclusion: </span>
                  {s.final_conclusion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryView({ id }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const hasToken = Boolean(getToken(id) || getAuthToken());
  const [state, setState] = useState({ loading: hasToken, error: '', code: hasToken ? '' : 'no_access', data: null });
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const participants = state.data && state.data.discussion ? state.data.discussion.participants : null;
  const metaMap = useMemo(() => participantMap({ participants }), [participants]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setState({ loading: true, error: '', code: '', data: null });
    try {
      const data = await getSummary(id);
      if (mountedRef.current) setState({ loading: false, error: '', code: '', data });
    } catch (e) {
      if (!mountedRef.current) return;
      const code = e.status === 404 ? 'not_found' : e.code || 'error';
      setState({ loading: false, error: friendlyError(e), code, data: null });
    }
  }, [id]);

  useEffect(() => {
    if (hasToken) load();
  }, [hasToken, load]);

  useEffect(() => {
    const topic = state.data && state.data.discussion ? state.data.discussion.topic : '';
    document.title = topic ? `Summary: ${topic} | ThinkTogether` : 'Summary | ThinkTogether';
    return () => {
      document.title = 'ThinkTogether';
    };
  }, [state.data]);

  const generate = async () => {
    setGenerating(true);
    try {
      await generateSummary(id);
      if (!mountedRef.current) return;
      await load();
      toast.success('Summary generated.');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  const copy = async (topic, summary) => {
    const ok = await copyText(buildPlainText(topic, summary));
    if (ok) {
      setCopied(true);
      toast.success('Summary copied to the clipboard.');
      setTimeout(() => {
        if (mountedRef.current) setCopied(false);
      }, 2000);
    } else {
      toast.error('Could not copy. Select the text manually instead.');
    }
  };

  const resumeButton = (discussion, primary = false) =>
    discussion && discussion.can_resume ? (
      <button
        type="button"
        onClick={() => setResumeOpen(true)}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${primary ? 'bg-alpha text-bg hover:opacity-90' : 'border border-line bg-surface text-fg hover:bg-surface-2'}`}
      >
        <IconPlay size={15} />
        Resume conversation
      </button>
    ) : null;

  const homeLink = (
    <Link to="/" className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
      Back to home
    </Link>
  );

  let body;
  if (state.loading) {
    body = <SummarySkeleton />;
  } else if (state.code === 'no_access' || state.code === 'not_found') {
    body = (
      <ErrorState
        tone="muted"
        title="You don't have access to this discussion"
        message={isLoggedIn ? 'It belongs to another account, or it no longer exists.' : 'It was started on another device or belongs to an account. If it is yours, log in to open it.'}
      >
        {!isLoggedIn && (
          <Link to={`/login?next=${encodeURIComponent(`/summary/${id}`)}`} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-2">
            Log in
          </Link>
        )}
        {homeLink}
      </ErrorState>
    );
  } else if (state.error) {
    body = <ErrorState title="Could not load the summary" message={state.error} onRetry={load} />;
  } else if (state.data) {
    const { summary, discussion, sessions } = state.data;
    const byGamma = (discussion.participants || []).some((p) => p.role === 'moderator');
    if (summary) {
      body = (
        <div className="space-y-4">
          <div className="animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={discussion.status} />
              {discussion.mode_name && <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{discussion.mode_name}</span>}
              <span className="text-xs text-muted">
                {discussion.turn_count} turns{sessions && sessions.length > 1 ? ` · Summary of session ${summary.part}` : ''}
              </span>
            </div>
            <h1 className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight text-fg sm:text-3xl">{discussion.topic}</h1>
            {byGamma && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <Avatar meta={metaFor(metaMap, 'gamma')} size={20} />
                Written by AI Gamma, the neutral moderator.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {resumeButton(discussion, true)}
              <button
                type="button"
                onClick={() => copy(discussion.topic, summary)}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2"
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                {copied ? 'Copied' : 'Copy summary'}
              </button>
              <Link to="/history" className="rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2">
                History
              </Link>
              <Link to="/" className="rounded-xl bg-alpha px-3.5 py-2 text-sm font-semibold text-bg transition hover:opacity-90">
                New discussion
              </Link>
            </div>
          </div>

          <Section title="Overview">
            <Prose>{summary.overview}</Prose>
          </Section>
          <Section title="Main ideas explored">
            <BulletList items={summary.main_ideas} />
          </Section>

          <Perspectives summary={summary} metaMap={metaMap} />

          {summary.strongest_arguments && summary.strongest_arguments.length > 0 && (
            <Section title="Strongest arguments" accent="text-gamma">
              <BulletList items={summary.strongest_arguments} />
            </Section>
          )}

          {summary.mode_outcome && (
            <section className="animate-fade-up rounded-2xl border border-alpha/30 bg-alpha/5 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-alpha">{summary.mode_outcome.title}</h2>
              <BulletList items={summary.mode_outcome.points} />
            </section>
          )}

          {LIST_SECTIONS.filter((s) => s.key !== 'main_ideas').map((s) => (
            <Section key={s.key} title={s.title} accent={s.key === 'human_contributions' ? 'text-you' : 'text-fg'}>
              <BulletList items={summary[s.key]} />
            </Section>
          ))}

          <section className="animate-fade-up rounded-2xl border border-alpha/40 bg-gradient-to-br from-alpha/10 to-beta/10 p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg">Final conclusion</h2>
            <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-fg">{summary.final_conclusion}</p>
          </section>

          <EarlierSessions sessions={sessions} currentPart={discussion.session} />
          <Transcript id={id} metaMap={metaMap} />
        </div>
      );
    } else if (LIVE_STATUSES.includes(discussion.status)) {
      body = (
        <div className="space-y-4">
          <ErrorState tone="muted" title="Discussion still in progress" message="The summary is created once the discussion finishes. You can head back to the room to follow along.">
            <Link to={`/room/${id}`} className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
              Back to the room
            </Link>
          </ErrorState>
          <EarlierSessions sessions={sessions} currentPart={discussion.session} />
        </div>
      );
    } else if (discussion.status === 'ended') {
      body = (
        <div className="space-y-4">
          <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10 text-center animate-fade-in">
            <StatusBadge status="ended" />
            <h2 className="mt-4 text-lg font-semibold text-fg">No conclusion yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">You ended this discussion early, so no conclusion was generated. You can still ask for a summary of what was said.</p>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="mt-6 flex items-center gap-2 rounded-xl bg-alpha px-5 py-3 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-70"
            >
              {generating && <IconSpinner size={16} />}
              {generating ? 'Generating summary…' : 'Generate summary'}
            </button>
            {generating && <p className="mt-3 text-xs text-muted">This can take up to a minute. Please keep this page open.</p>}
            {!generating && discussion.can_resume && <div className="mt-3">{resumeButton(discussion)}</div>}
          </div>
          <EarlierSessions sessions={sessions} currentPart={discussion.session} />
          <Transcript id={id} metaMap={metaMap} />
        </div>
      );
    } else {
      body = (
        <ErrorState title="The summary is not available" message="This discussion is marked complete but has no saved summary yet." onRetry={load} retryLabel="Check again">
          <button type="button" onClick={() => navigate(`/room/${id}`)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-2">
            Open the room
          </button>
        </ErrorState>
      );
    }
  }

  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">{body}</main>
      {state.data && state.data.discussion && (
        <ResumeDialog
          open={resumeOpen}
          discussionId={id}
          topic={state.data.discussion.topic}
          onClose={() => setResumeOpen(false)}
          onResumed={() => {
            setResumeOpen(false);
            toast.success('Conversation resumed. The AIs remember everything said so far.');
            navigate(`/room/${id}`);
          }}
        />
      )}
    </div>
  );
}

export default function Summary() {
  const { id } = useParams();
  return <SummaryView key={id} id={id} />;
}
