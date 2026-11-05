/** Animated "someone is speaking" indicator: sound-wave bars or three bouncing dots. */
export default function SpeakingIndicator({ variant = 'wave', colorClass = 'text-alpha', className = '' }) {
  if (variant === 'dots') {
    return (
      <span className={`inline-flex items-center gap-1 ${colorClass} ${className}`} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-current animate-dot" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
    );
  }
  return (
    <span className={`inline-flex h-3.5 items-center gap-[3px] ${colorClass} ${className}`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-full w-[3px] origin-center rounded-full bg-current animate-wave"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
