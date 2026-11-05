import { IconAlert } from './Icons.jsx';

/** Centered error / empty panel with an optional retry button and extra actions. */
export default function ErrorState({ title, message, onRetry, retryLabel = 'Try again', children, tone = 'danger' }) {
  const toneCls = tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted';
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center animate-fade-in">
      <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${toneCls}`}>
        <IconAlert size={22} />
      </span>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {message && <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            {retryLabel}
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
