import { useEffect, useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal.jsx';
import SpeakingIndicator from './SpeakingIndicator.jsx';
import { IconPause, IconPlay, IconSend, IconSpinner, IconStop, IconZap } from './Icons.jsx';

const MAX_LENGTH = 4000;

function ActionButton({ onClick, disabled, loading, className, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? <IconSpinner size={16} /> : icon}
      {children}
    </button>
  );
}

export default function Controls({ discussion, busy, sending, onPause, onResume, onInterrupt, onEnd, onSend }) {
  const [text, setText] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const inputRef = useRef(null);

  const status = discussion.status;
  const waiting = status === 'waiting_user';
  const concluding = status === 'concluding';
  const composerEnabled = status === 'active' || status === 'paused' || waiting;
  const willInterrupt = status === 'active' && discussion.generating;
  const locked = Boolean(busy) || sending;
  const overLimit = text.length > MAX_LENGTH;
  const canSend = composerEnabled && !locked && text.trim().length > 0 && !overLimit;

  useEffect(() => {
    if (waiting && inputRef.current) inputRef.current.focus();
  }, [waiting]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text, composerEnabled]);

  const submit = async () => {
    if (!canSend) return;
    const sent = text;
    const ok = await onSend(sent.trim());
    if (ok) setText((current) => (current === sent ? '' : current));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const confirmEndNow = async () => {
    await onEnd();
    setConfirmEnd(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'active' && (
          <ActionButton
            onClick={onPause}
            disabled={locked}
            loading={busy === 'pause'}
            icon={<IconPause size={16} />}
            className="border border-line bg-surface text-fg hover:bg-surface-2"
          >
            Pause
          </ActionButton>
        )}
        {status === 'paused' && (
          <ActionButton
            onClick={onResume}
            disabled={locked}
            loading={busy === 'resume'}
            icon={<IconPlay size={16} />}
            className="bg-ok text-bg hover:opacity-90"
          >
            Resume
          </ActionButton>
        )}
        {waiting && (
          <ActionButton
            onClick={onResume}
            disabled={locked}
            loading={busy === 'resume'}
            icon={<IconPlay size={16} />}
            className="border border-line bg-surface text-fg hover:bg-surface-2"
          >
            Let them continue
          </ActionButton>
        )}
        {status === 'active' && (
          <ActionButton
            onClick={onInterrupt}
            disabled={locked}
            loading={busy === 'interrupt'}
            icon={<IconZap size={16} />}
            className="flex-1 bg-warn text-bg shadow-md shadow-warn/25 hover:opacity-90 sm:flex-none"
          >
            Interrupt
          </ActionButton>
        )}
        <ActionButton
          onClick={() => setConfirmEnd(true)}
          disabled={locked}
          icon={<IconStop size={15} />}
          className="ml-auto border border-danger/30 text-danger hover:bg-danger/10"
        >
          End discussion
        </ActionButton>
      </div>

      {concluding && (
        <div className="flex items-center gap-2.5 rounded-xl border border-beta/30 bg-beta/10 px-3.5 py-3 text-sm text-fg">
          <SpeakingIndicator variant="wave" colorClass="text-beta" />
          The thinkers are sharing their closing thoughts and preparing the summary.
        </div>
      )}

      {composerEnabled && (
        <div>
          {waiting && (
            <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-warn">
              <SpeakingIndicator variant="dots" colorClass="text-warn" />
              The AIs are waiting for you. Say something and the discussion continues.
            </p>
          )}
          <div
            className={`flex items-end gap-2 rounded-2xl border bg-surface p-1.5 transition ${
              waiting ? 'border-warn shadow-[0_0_0_3px_rgb(var(--warn)/0.18)]' : 'border-line focus-within:border-alpha/60'
            }`}
          >
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={waiting ? 'Your turn. What would you like to say?' : 'Join the discussion…'}
              aria-label="Your message"
              className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] text-fg placeholder:text-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                willInterrupt ? 'bg-warn text-bg' : 'bg-alpha text-bg'
              }`}
            >
              {sending ? <IconSpinner size={16} /> : willInterrupt ? <IconZap size={16} /> : <IconSend size={16} />}
              <span>{willInterrupt ? 'Interrupt & send' : 'Send'}</span>
            </button>
          </div>
          <div className="mt-1 flex justify-between px-1 text-[11px] text-muted">
            <span className="hidden sm:inline">Enter to send, Shift+Enter for a new line</span>
            <span className={`ml-auto tabular-nums ${overLimit ? 'text-danger' : ''}`}>
              {text.length > MAX_LENGTH * 0.8 ? `${text.length}/${MAX_LENGTH}` : ''}
            </span>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmEnd}
        title="End this discussion?"
        body="The discussion stops right away and the AIs will not write closing thoughts. You can still generate a summary of what was said from the summary page."
        confirmLabel="End discussion"
        danger
        busy={busy === 'end'}
        onConfirm={confirmEndNow}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
}
