/** A tennis ball (the timing game's ball). */
export function BallIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#dfeb3f" />
      <path
        d="M4.2 4.6c3.6 3.9 3.6 10.9 0 14.8M19.8 4.6c-3.6 3.9-3.6 10.9 0 14.8"
        fill="none"
        stroke="#3b3f1a"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The logo: "ACEDLE" on a tilted red badge with a blue offset shadow, like a
 * card maker's mark. Narrow phones get just the "A". Decorative: label the
 * link around it.
 */
export function Wordmark() {
  return (
    <span
      aria-hidden
      className="inline-flex -rotate-3 items-center gap-1 rounded-[5px] border-2 border-fg bg-accent px-1.5 pt-0.5 pb-px font-display text-base leading-none sm:px-2 sm:text-xl tracking-wide text-accent-ink uppercase shadow-[3px_3px_0_0_var(--blue)]">
      <svg viewBox="0 0 24 24" className="size-3 fill-gold" aria-hidden>
        <path d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6l-6.4 3.5L7 14l-5.3-5 7.2-.9z" />
      </svg>
      <span className="max-[359px]:hidden">Acedle</span>
      <span className="hidden max-[359px]:inline">A</span>
    </span>
  );
}
