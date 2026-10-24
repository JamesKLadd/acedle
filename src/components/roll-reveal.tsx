"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FIRST_YEAR, LAST_YEAR } from "@/lib/data/years";
import type { PlayerSeason } from "@/lib/data/types";
import { fmtYmd } from "@/lib/format";
import { frameIndexAt, revealTimeline } from "@/lib/reveal";
import type { ScoreResult } from "@/lib/scoring/types";

import { BadgeRow, CARD_CLASS, PlayerLine, ScoreTotals } from "./roll-card";

/** How long the score takes to count up to each new value. */
const TWEEN_MS = 280;
const YEARS = LAST_YEAR - FIRST_YEAR + 1;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Plays a roll: the year spins and lands, the player appears, then the badges
 * add up (points first, then multipliers). Ends looking exactly like RollCard.
 * Calls `onDone` once at the end (also after Skip).
 */
export function RollReveal({
  season,
  score,
  onDone,
}: {
  season: PlayerSeason;
  score: ScoreResult;
  onDone?: () => void;
}) {
  const timeline = useMemo(() => revealTimeline(score), [score]);
  const [elapsed, setElapsed] = useState(() => (prefersReducedMotion() ? timeline.doneAt : 0));
  const start = useRef<number | null>(null);
  const done = elapsed >= timeline.doneAt;

  useEffect(() => {
    if (done) return;
    let raf = requestAnimationFrame(function tick(now) {
      start.current ??= now;
      const e = now - start.current;
      setElapsed(e);
      if (e < timeline.doneAt) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
    // Runs once per reveal; `done` only flips at the end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  const notified = useRef(false);
  useEffect(() => {
    if (done && !notified.current) {
      notified.current = true;
      onDone?.();
    }
  }, [done, onDone]);

  function skip() {
    start.current = performance.now() - timeline.doneAt;
  }

  const i = frameIndexAt(timeline, elapsed);
  const frame = timeline.frames[i];
  const prev = timeline.frames[Math.max(0, i - 1)];
  const t = done ? 1 : Math.min(1, (elapsed - frame.at) / TWEEN_MS);
  const eased = 1 - (1 - t) ** 3;
  const tween = (from: number, to: number) => from + (to - from) * eased;

  const yearLanded = elapsed >= timeline.yearAt;
  const spinningYear = FIRST_YEAR + ((Math.floor(elapsed / 70) * 7919) % YEARS);

  return (
    <section className={CARD_CLASS}>
      <div className="flex items-start justify-between gap-4">
        <p
          className={`font-mono text-sm ${yearLanded ? "text-muted" : "text-subtle/60"}`}
          aria-live="polite"
        >
          {yearLanded ? season.year : spinningYear}
          {yearLanded && season.live && ` · live season, ranked as of ${fmtYmd(season.dataAsOf)}`}
        </p>
        {!done && (
          <button onClick={skip} className="text-xs text-muted underline underline-offset-4 hover:text-fg">
            Skip
          </button>
        )}
      </div>

      {elapsed >= timeline.playerAt ? (
        <div className="animate-reveal">
          <PlayerLine season={season} />
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-subtle/50">Rolling…</h2>
          <p className="text-sm text-transparent">.</p>
        </>
      )}

      <ul className="mt-4 divide-y divide-line/70">
        {timeline.badges.slice(0, frame.shown).map((b) => (
          <BadgeRow key={b.id} badge={b} className="animate-reveal" />
        ))}
      </ul>

      <ScoreTotals
        base={Math.round(tween(prev.base, frame.base))}
        multiplier={frame.multiplier}
        total={Math.round(tween(prev.total, frame.total))}
        final={done}
      />
    </section>
  );
}
