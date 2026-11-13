import { useEffect, useId, useRef } from 'react';
import { IconX } from './Icons.jsx';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: Escape and the backdrop close it (unless `busy`), Tab stays inside, focus returns to the
 * opener when it closes. Slides up from the bottom on phones, centred on larger screens; tall content scrolls.
 */
export default function Modal({ open, title, subtitle, onClose, busy = false, children, footer, wide = false }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const focusables = () => (panel ? Array.from(panel.querySelectorAll(FOCUSABLE)) : []);
    const first = focusables().find((el) => el.dataset.autofocus === 'true') || focusables()[0];
    if (first) first.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && !busyRef.current) closeRef.current();
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const i = list.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) {
        e.preventDefault();
        list[list.length - 1].focus();
      } else if (!e.shiftKey && (i === list.length - 1 || i === -1)) {
        e.preventDefault();
        list[0].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div
        ref={panelRef}
        className={`relative flex max-h-[92dvh] w-full animate-fade-up flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="-mr-1 rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-40" aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 pb-safe sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}
