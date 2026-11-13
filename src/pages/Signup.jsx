import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import { AuthCard, Field, FormError } from '../components/AuthForm.jsx';
import { IconSpinner } from '../components/Icons.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { safeNext } from '../lib/auth.js';
import { friendlyError } from '../lib/format.js';

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Enter your name.';
  else if (f.name.trim().length > 60) e.name = 'Keep your name under 60 characters.';
  if (!USERNAME_RE.test(f.username.trim().toLowerCase())) e.username = 'Use 3 to 30 characters: small letters, numbers or underscore (_).';
  if (f.password.length < 8) e.password = 'Use at least 8 characters.';
  else if (f.password.length > 72) e.password = 'Use at most 72 characters.';
  if (f.confirm !== f.password) e.confirm_password = 'Both passwords must match.';
  if (f.hint.length > 100) e.password_hint = 'Keep the hint under 100 characters.';
  else if (f.hint && f.password && f.hint.toLowerCase().includes(f.password.toLowerCase())) e.password_hint = 'Your hint must not contain your password.';
  return e;
}

export default function Signup() {
  const { isLoggedIn, signup } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', username: '', password: '', confirm: '', hint: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Create account | ThinkTogether';
    return () => {
      document.title = 'ThinkTogether';
    };
  }, []);

  if (isLoggedIn && !submitting) return <Navigate to={next} replace />;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    const map = { confirm: 'confirm_password', hint: 'password_hint' };
    const field = map[key] || key;
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      await signup({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm,
        password_hint: form.hint.trim(),
      });
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
          title="Create your account"
          subtitle="Your discussions are private to your account. Other users and guests can never see them. Site admins can review account discussions for safety."
          footer={
            <>
              Already have an account?{' '}
              <Link to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-alpha hover:underline">
                Log in
              </Link>
            </>
          }
        >
          <form onSubmit={submit} className="space-y-5" noValidate>
            <Field label="Name" value={form.name} onChange={set('name')} autoComplete="name" maxLength={60} autoFocus error={fieldErrors.name} />
            <Field
              label="Username"
              value={form.username}
              onChange={set('username')}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={30}
              help="Small letters, numbers or underscore (_). You will use this to log in."
              error={fieldErrors.username}
            />
            <Field
              label="Password"
              reveal
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              maxLength={72}
              help="At least 8 characters."
              error={fieldErrors.password}
            />
            <Field
              label="Confirm password"
              reveal
              value={form.confirm}
              onChange={set('confirm')}
              autoComplete="new-password"
              maxLength={72}
              error={fieldErrors.confirm_password}
            />
            <Field
              label="Password hint"
              optional
              value={form.hint}
              onChange={set('hint')}
              autoComplete="off"
              maxLength={100}
              help="Something that reminds only you of your password. Anyone who knows your username can see it, so never write the password itself."
              error={fieldErrors.password_hint}
            />
            <FormError>{formError}</FormError>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-alpha text-[15px] font-semibold text-bg transition hover:opacity-95 disabled:opacity-60"
            >
              {submitting && <IconSpinner size={18} />}
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </AuthCard>
      </main>
    </div>
  );
}
