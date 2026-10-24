/** A tennis ball: the accent circle with its two seams. */
export function BallIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="var(--accent)" />
      <path
        d="M4.2 4.6c3.6 3.9 3.6 10.9 0 14.8M19.8 4.6c-3.6 3.9-3.6 10.9 0 14.8"
        fill="none"
        stroke="var(--accent-ink)"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <BallIcon className="size-6" />
      <span className="font-display text-2xl leading-none font-extrabold tracking-wide uppercase">Acedle</span>
    </span>
  );
}
