import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import { AuthCard, Field, FormError } from '../components/AuthForm.jsx';
import { IconKey, IconSpinner } from '../components/Icons.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { passwordHint } from '../lib/api.js';
import { safeNext } from '../lib/auth.js';
import { friendlyError } from '../lib/format.js';

function HintBox({ username }) {
  const [state, setState] = useState({ loading: false, text: '', error: '' });

  const show = async () => {
    if (!username.trim()) {
      setState({ loading: false, text: '', error: 'Type your username above first.' });
      return;
    }
    setState({ loading: true, text: '', error: '' });
    try {
      const res = await passwordHint(username.trim());
      setState({ loading: false, text: res.hint || '', error: res.hint ? '' : 'No hint was saved for this username.' });
    } catch (e) {
      setState({ loading: false, text: '', error: friendlyError(e) });
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
      <p className="text-sm text-fg">Forgot your password? See the hint you saved when you signed up.</p>
      <button
        type="button"
        onClick={show}
        disabled={state.loading}
        className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2 disabled:opacity-60"
      >
        {state.loading ? <IconSpinner size={16} /> : <IconKey size={16} />}
        Show my hint
      </button>
      {state.text && (
        <p className="mt-3 rounded-xl border border-alpha/30 bg-alpha/10 px-3.5 py-2.5 text-sm text-fg" role="status">
          <span className="font-semibold">Your hint:</span> <span className="break-words">{state.text}</span>
        </p>
      )}
      {state.error && (
        <p className="mt-3 text-sm text-muted" role="status">
          {state.error}
        </p>
      )}
    </div>
  );
}

export default function Login() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    document.title = 'Log in | ThinkTogether';
    return () => {
      document.title = 'ThinkTogether';
    };
  }, []);

  if (isLoggedIn && !submitting) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!username.trim()) errors.username = 'Enter your username.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err.code === 'validation_error' && err.details?.fields) setFieldErrors(err.details.fields);
      else setFormError(friendlyError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh]">
      <TopNav />
      <main className="px-4 pb-16 pt-10 sm:pt-16">
        <AuthCard
          title="Welcome back"
          subtitle="Log in to see all your discussions on any device."
          footer={
            <>
              New here?{' '}
              <Link to={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-alpha hover:underline">
                Create an account
              </Link>
              <span className="mx-2">·</span>
              <Link to="/" className="hover:text-fg hover:underline">
                Continue as guest
              </Link>
            </>
          }
        >
          <form onSubmit={submit} className="space-y-5" noValidate>
            <Field
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              error={fieldErrors.username}
            />
            <Field
              label="Password"
              reveal
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              error={fieldErrors.password}
            />
            <FormError>{formError}</FormError>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-alpha text-[15px] font-semibold text-bg transition hover:opacity-95 disabled:opacity-60"
            >
              {submitting && <IconSpinner size={18} />}
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setShowHint((v) => !v)} className="text-sm text-muted hover:text-fg hover:underline" aria-expanded={showHint}>
                Forgot password?
              </button>
            </div>
            {showHint && <HintBox username={username} />}
          </form>
        </AuthCard>
      </main>
    </div>
  );
}
