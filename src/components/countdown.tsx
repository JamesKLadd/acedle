"use client";

import { Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { fmtCountdown, msUntilReset, utcDayOf } from "@/lib/clock";
import { rememberRollDay, useLastRollDay, useNowSeconds } from "@/lib/prefs";

/** Notes that this browser has seen today's roll (for the header pill). */
export function RememberRoll({ day }: { day: string }) {
  useEffect(() => rememberRollDay(day), [day]);
  return null;
}

/** "Next roll in 07:42:13", refreshing the page into a new Roll button at midnight UTC. */
export function NextRollCountdown() {
  const router = useRouter();
  const now = useNowSeconds();
  const startDay = useRef<string | null>(null);
  const day = now === null ? null : utcDayOf(now * 1000);
  useEffect(() => {
    if (day === null) return;
    startDay.current ??= day;
    if (day !== startDay.current) router.refresh();
  }, [day, router]);

  if (now === null) return <span className="tabular font-mono">--:--:--</span>;
  const ms = msUntilReset(now * 1000);
  const local = new Date(now * 1000 + ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <span>
      Next roll in <strong className="tabular font-mono text-fg">{fmtCountdown(ms)}</strong>
      <span className="text-subtle"> · midnight UTC ({local} your time)</span>
    </span>
  );
}

/** Whether this browser hasn't seen today's roll yet (null until mounted). */
function useRollReady(): { ready: boolean; now: number } | null {
  const now = useNowSeconds();
  const last = useLastRollDay();
  if (now === null) return null;
  return { ready: last !== utcDayOf(now * 1000), now };
}

/**
 * Header pill from sm up: "Roll ready" until today's roll is seen, then the
 * countdown. Phones get RollReadyDot instead (the header is full there).
 */
export function NextRollPill() {
  const state = useRollReady();
  if (state === null) return null;
  if (state.ready) {
    return (
      <Link
        href="/"
        className="hidden h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-bold whitespace-nowrap text-accent-ink shadow-sm hover:brightness-105 sm:flex"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-ink/50 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-accent-ink" />
        </span>
        Roll ready
      </Link>
    );
  }
  return (
    <span
      className="hidden h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-muted sm:flex"
      title="Next roll (midnight UTC)"
    >
      <Timer className="size-3.5" aria-hidden />
      <span className="tabular font-mono">{fmtCountdown(msUntilReset(state.now * 1000))}</span>
    </span>
  );
}

/** On phones, a pulsing dot on the logo while today's roll is waiting. Render inside the logo link. */
export function RollReadyDot() {
  const state = useRollReady();
  if (!state?.ready) return null;
  return (
    <span className="absolute top-0 left-4.5 flex size-2.5 sm:hidden">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-cat-surface/60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2.5 rounded-full bg-cat-surface ring-2 ring-bg" />
      <span className="sr-only">(today&apos;s roll is ready)</span>
    </span>
  );
}
