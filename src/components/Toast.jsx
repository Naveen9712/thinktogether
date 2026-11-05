import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IconAlert, IconCheck, IconX } from './Icons.jsx';

const ToastContext = createContext(null);

const TYPE_STYLES = {
  success: { border: 'border-ok/40', accent: 'text-ok' },
  error: { border: 'border-danger/40', accent: 'text-danger' },
  info: { border: 'border-line', accent: 'text-alpha' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = 'info', duration = 4500) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error', 7000),
      info: (message) => show(message, 'info'),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-center gap-2 pt-safe sm:inset-x-auto sm:right-4 sm:items-end"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => {
          const style = TYPE_STYLES[t.type] || TYPE_STYLES.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-2.5 rounded-xl border ${style.border} bg-surface px-3.5 py-3 text-sm text-fg shadow-lg shadow-black/20`}
            >
              <span className={`mt-0.5 shrink-0 ${style.accent}`}>
                {t.type === 'success' ? <IconCheck size={16} /> : <IconAlert size={16} />}
              </span>
              <p className="min-w-0 flex-1 break-words leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-mr-1 shrink-0 rounded p-1 text-muted hover:text-fg"
                aria-label="Dismiss notification"
              >
                <IconX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
