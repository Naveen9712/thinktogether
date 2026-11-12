import { useId, useState } from 'react';
import { IconEye, IconEyeOff } from './Icons.jsx';

export const inputCls =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] text-fg placeholder:text-muted transition focus:border-alpha/60 focus:outline-none focus:ring-2 focus:ring-alpha/20 aria-[invalid=true]:border-danger/60';

/** A labelled input with help text and an error line, wired up for screen readers. */
export function Field({ label, help, error, optional, type = 'text', reveal = false, ...props }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const inputType = reveal ? (shown ? 'text' : 'password') : type;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-fg">
          {label}
        </label>
        {optional && <span className="text-xs text-muted">Optional</span>}
      </div>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${inputCls} ${reveal ? 'pr-11' : ''}`}
          {...props}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted hover:text-fg"
            aria-label={shown ? 'Hide password' : 'Show password'}
          >
            {shown ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        )}
      </div>
      {help && !error && (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-fg" role="alert">
      {children}
    </div>
  );
}

/** Centered card used by the login and signup pages. */
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-md animate-fade-up">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="rounded-3xl border border-line bg-surface/60 p-5 sm:p-7">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
