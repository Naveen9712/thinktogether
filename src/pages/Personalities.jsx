import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import Avatar from '../components/Avatar.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Skeleton from '../components/Skeleton.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import PersonalityForm from '../components/PersonalityForm.jsx';
import { IconPlus, IconTrash } from '../components/Icons.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { deletePersonality, listPersonalities } from '../lib/api.js';
import { safeNext } from '../lib/auth.js';
import { friendlyError } from '../lib/format.js';
import { seatStyle } from '../lib/participants.js';

const CUSTOM_STYLE = seatStyle('epsilon');
const BUILTIN_STYLE = seatStyle('alpha');

function Details({ p }) {
  return (
    <dl className="mt-3 grid gap-2 text-sm">
      {[
        ['Thinking style', p.thinking_style],
        ['Behaviour', p.behaviour],
        ['Tone', p.tone],
      ].map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-0.5 break-words leading-snug text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function CustomCard({ p, onEdit, onDelete }) {
  return (
    <article className="flex animate-fade-up flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar meta={{ key: 'epsilon', style: CUSTOM_STYLE, icon: 'custom' }} size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[15px] font-semibold text-fg">{p.name}</h3>
          <p className="mt-0.5 text-sm leading-snug text-muted">{p.description}</p>
          {p.based_on && <p className="mt-1 text-xs text-muted">Customised from a built-in personality</p>}
        </div>
      </div>
      <Details p={p} />
      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => onEdit(p)} className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2">
          Edit
        </button>
        <button type="button" onClick={() => onDelete(p)} className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-danger/10 hover:text-danger">
          <IconTrash size={14} />
          Delete
        </button>
      </div>
    </article>
  );
}

function BuiltinCard({ p, onCustomise, disabled }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar meta={{ key: 'alpha', style: BUILTIN_STYLE, icon: p.icon }} size={36} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-fg">{p.name}</h3>
          <p className="mt-0.5 text-sm leading-snug text-muted">{p.description}</p>
        </div>
      </div>
      <div className="mt-auto pt-3">
        <button
          type="button"
          onClick={() => onCustomise(p)}
          disabled={disabled}
          className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Customise
        </button>
      </div>
    </article>
  );
}

function Loading() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="status" aria-label="Loading personalities">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** "My AI personalities": create, edit, delete and customise; they appear in the start form for reuse. */
export default function Personalities() {
  const { isLoggedIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const back = params.get('back') ? safeNext(params.get('back')) : null;
  const [state, setState] = useState({ loading: true, error: '', custom: [], builtin: [], limit: 20 });
  const [editing, setEditing] = useState(null); // { initial } while the form is open
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = 'My AI personalities | ThinkTogether';
    return () => {
      document.title = 'ThinkTogether';
    };
  }, []);

  const load = useCallback(async (signal) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await listPersonalities({ signal });
      setState({ loading: false, error: '', custom: res.custom, builtin: res.builtin, limit: res.limit });
    } catch (e) {
      if (e.code === 'ERR_CANCELED') return;
      setState((s) => ({ ...s, loading: false, error: friendlyError(e) }));
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [isLoggedIn, load]);

  // /personalities?new=1 (from the start form) opens the editor straight away.
  useEffect(() => {
    if (isLoggedIn && params.get('new') === '1' && !state.loading && !state.error && editing === null) {
      setEditing({ initial: null });
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [isLoggedIn, params, setParams, state.loading, state.error, editing]);

  const full = state.custom.length >= state.limit;

  const saved = (p, wasEdit) => {
    setEditing(null);
    setState((s) => ({
      ...s,
      custom: wasEdit ? s.custom.map((x) => (x.id === p.id ? p : x)) : [p, ...s.custom],
    }));
    toast.success(wasEdit ? 'Personality updated. New discussions will use the new version.' : 'Personality saved. You can choose it when you start a discussion.');
    if (!wasEdit && back) navigate(back);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePersonality(toDelete.id);
      setState((s) => ({ ...s, custom: s.custom.filter((x) => x.id !== toDelete.id) }));
      toast.info('Personality deleted. Past discussions keep their copy.');
      setToDelete(null);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setDeleting(false);
    }
  };

  let body;
  if (!isLoggedIn) {
    body = (
      <ErrorState tone="muted" title="Create your own AI personalities" message="Log in or create a free account to design personalities with their own thinking style, behaviour and tone, and reuse them in your discussions.">
        <Link to="/login?next=/personalities" className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
          Log in
        </Link>
        <Link to="/signup?next=/personalities" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-2">
          Create account
        </Link>
      </ErrorState>
    );
  } else if (state.loading) {
    body = <Loading />;
  } else if (state.error) {
    body = <ErrorState title="Could not load your personalities" message={state.error} onRetry={() => load()} />;
  } else {
    body = (
      <div className="space-y-10">
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg">Your personalities</h2>
            <span className="text-xs text-muted">
              {state.custom.length} of {state.limit}
            </span>
          </div>
          {state.custom.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center">
              <p className="text-sm text-muted">You have not created any personalities yet. Start from scratch, or customise one of the built-in ones below.</p>
              <button type="button" onClick={() => setEditing({ initial: null })} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90">
                <IconPlus size={16} />
                Create a personality
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {state.custom.map((p) => (
                <CustomCard key={p.id} p={p} onEdit={(x) => setEditing({ initial: x })} onDelete={setToDelete} />
              ))}
            </div>
          )}
          {full && <p className="mt-3 text-sm text-muted">You have reached the limit. Delete a personality to add another.</p>}
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-fg">Built-in personalities</h2>
          <p className="mb-3 text-sm text-muted">Customise one to save your own editable copy.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.builtin.map((p) => (
              <BuiltinCard key={p.ref} p={p} disabled={full} onCustomise={(x) => setEditing({ initial: { ...x, based_on: x.ref } })} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-fg">My AI personalities</h1>
            <p className="mt-1 text-sm text-muted">Design how your AIs think and talk, then pick them when you start a discussion.</p>
          </div>
          {isLoggedIn && !state.loading && !state.error && (
            <button
              type="button"
              onClick={() => setEditing({ initial: null })}
              disabled={full}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-alpha px-3.5 py-2 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconPlus size={16} />
              New personality
            </button>
          )}
        </div>
        {back && isLoggedIn && (
          <p className="mb-5 text-sm">
            <Link to={back} className="font-semibold text-alpha hover:underline">
              ← Back to your discussion setup
            </Link>
          </p>
        )}
        {body}
      </main>
      <PersonalityForm open={editing !== null} initial={editing ? editing.initial : null} onClose={() => setEditing(null)} onSaved={saved} />
      <ConfirmModal
        open={toDelete !== null}
        title="Delete this personality?"
        body={toDelete ? `"${toDelete.name}" will be removed from your account. Discussions that already used it keep their own copy.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
