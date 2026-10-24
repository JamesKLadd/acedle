"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { PlayerSeason } from "@/lib/data/types";
import { FIRST_YEAR, LAST_YEAR } from "@/lib/data/years";
import { isSpecial, rarityOf } from "@/lib/rarity";
import { frameIndexAt, revealTimeline } from "@/lib/reveal";
import type { ScoreResult } from "@/lib/scoring/types";
import { sfx } from "@/lib/sound";

import {
  BadgeSections,
  PlayerFacts,
  PlayerName,
  RarityChip,
  RarityFrame,
  Scoreboard,
  SeasonLabel,
} from "./roll-card";

/** How long the score takes to count up to each new value. */
const TWEEN_MS = 280;
/** Years the year reel passes before landing. */
const YEAR_STEPS = 18;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reel motion: fast start, a long slow-down that nudges just past the final
 * item at 85% of the time, then settles back onto it.
 */
function reelEase(t: number) {
  const OVERSHOOT = 0.04;
  if (t < 0.85) return (1 + OVERSHOOT) * (1 - (1 - t / 0.85) ** 3);
  const u = (t - 0.85) / 0.15;
  return 1 + OVERSHOOT * (1 - u * u * (3 - 2 * u));
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * A slot-machine reel: scrolls through `items` and stops on the last one.
 * Inline reels are as wide as their widest item; block reels fill the line.
 */
function Reel({ items, progress, inline = false }: { items: readonly string[]; progress: number; inline?: boolean }) {
  const pos = reelEase(clamp01(progress)) * (items.length - 1);
  return (
    <span className={`relative overflow-hidden ${inline ? "inline-block align-bottom" : "block"}`} style={{ height: "1.15em" }}>
      <span
        className={`block ${progress < 0.7 ? "blur-[0.6px]" : ""}`}
        style={{ transform: `translateY(${-pos * 1.15}em)` }}
      >
        {/* One spare item so the overshoot never shows a gap. */}
        {[...items, items[items.length - 2] ?? ""].map((item, i) => (
          <span key={i} className="block truncate" style={{ height: "1.15em", lineHeight: "1.15em" }}>
            {item}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * When `version` changes, slides rows (marked data-flip) from where they were
 * to where they are now. Positions come from offsetTop, which ignores the
 * transforms of slides still running.
 */
function useFlip(version: number) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = new Map<string, number>();
    for (const item of el.querySelectorAll<HTMLElement>("[data-flip]")) {
      const key = item.dataset.flip!;
      const top = item.offsetTop;
      next.set(key, top);
      const before = prev.current.get(key);
      if (before === undefined || Math.abs(before - top) < 0.5) continue;
      for (const a of item.getAnimations()) if (a.id === "flip") a.cancel();
      item.animate([{ transform: `translateY(${before - top}px)` }, { transform: "none" }], {
        id: "flip",
        duration: 280,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
    }
    prev.current = next;
  }, [version]);
  return ref;
}

/**
 * Plays a roll: the year reel spins and lands, then the player reel, then the
 * badges add up (points first, then multipliers) into lists kept biggest
 * first. Ends looking like RollCard. Calls `onDone` once at the end (also
 * after Skip, or straight away with reduced motion).
 */
export function RollReveal({
  season,
  score,
  decoys,
  topPercent,
  onDone,
}: {
  season: PlayerSeason;
  score: ScoreResult;
  /** Other players from the season, for the name reel. */
  decoys: readonly string[];
  topPercent: number;
  onDone?: () => void;
}) {
  const timeline = useMemo(() => revealTimeline(score), [score]);
  const [elapsed, setElapsed] = useState(() => (prefersReducedMotion() ? timeline.doneAt : 0));
  const start = useRef<number | null>(null);
  const done = elapsed >= timeline.doneAt;

  const years = useMemo(() => {
    const span = LAST_YEAR - FIRST_YEAR + 1;
    const list = Array.from({ length: YEAR_STEPS }, (_, i) =>
      String(FIRST_YEAR + ((season.playerId + i * 7919) % span)),
    );
    return [...list, String(season.year)];
  }, [season]);
  const names = useMemo(() => [...decoys, season.name], [decoys, season]);

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

  function skip() {
    start.current = performance.now() - timeline.doneAt;
  }

  // Space or Escape skips.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Escape") && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const yearProgress = elapsed / timeline.yearAt;
  const playerProgress = (elapsed - timeline.yearAt) / (timeline.playerAt - timeline.yearAt);
  const yearLanded = yearProgress >= 1;
  const playerLanded = playerProgress >= 1;
  const i = frameIndexAt(timeline, elapsed);
  const frame = timeline.frames[i];
  const prev = timeline.frames[Math.max(0, i - 1)];
  const t = done ? 1 : clamp01((elapsed - frame.at) / TWEEN_MS);
  const eased = 1 - (1 - t) ** 3;
  const tween = (from: number, to: number) => from + (to - from) * eased;
  const rarity = rarityOf(topPercent);

  // Sounds and the finale: reel ticks, landings, each badge, confetti.
  const reelStep = yearLanded
    ? Math.floor(clamp01(playerProgress) * (names.length - 1))
    : Math.floor(clamp01(yearProgress) * (years.length - 1));
  const heard = useRef({ reel: -1, yearLanded: false, playerLanded: false, frame: 0, done: false });
  useEffect(() => {
    const h = heard.current;
    if (done) {
      if (h.done) return;
      h.done = true;
      if (isSpecial(rarity.id)) {
        sfx.fanfare();
        if (!prefersReducedMotion()) {
          void import("canvas-confetti").then(({ default: confetti }) =>
            confetti({ particleCount: rarity.id === "mythic" ? 220 : 130, spread: 80, origin: { y: 0.35 } }),
          );
        }
      }
      onDone?.();
      return;
    }
    if (reelStep !== h.reel && !playerLanded) {
      h.reel = reelStep;
      sfx.tick();
    }
    if (yearLanded && !h.yearLanded) {
      h.yearLanded = true;
      sfx.land();
    }
    if (playerLanded && !h.playerLanded) {
      h.playerLanded = true;
      sfx.land();
    }
    if (i > h.frame) {
      h.frame = i;
      const badge = timeline.badges[frame.shown - 1];
      if (badge?.multiplier != null) sfx.multiplier(Math.min(1, Math.log10(badge.multiplier)));
      else if (badge) sfx.points(Math.min(1, badge.points / 30_000));
    }
  });

  const flipRef = useFlip(frame.shown);

  return (
    <RarityFrame rarity={done ? rarity.id : null}>
      <div className="flex items-start justify-between gap-3">
        <SeasonLabel
          season={season}
          year={yearLanded ? undefined : <Reel items={years} progress={yearProgress} inline />}
        />
        {done ? (
          <RarityChip topPercent={topPercent} className="animate-pop" />
        ) : (
          <button onClick={skip} className="text-xs font-medium text-muted underline underline-offset-4 hover:text-fg">
            Skip <span className="hidden sm:inline">(Space)</span>
          </button>
        )}
      </div>

      <PlayerName>
        {playerLanded ? (
          season.name
        ) : yearLanded ? (
          <Reel items={names} progress={playerProgress} />
        ) : (
          <span className="text-subtle/50">Rolling…</span>
        )}
      </PlayerName>
      {playerLanded ? (
        <div className="animate-reveal">
          <PlayerFacts season={season} tierClass="animate-pop" />
        </div>
      ) : (
        <p className="mt-1 text-sm text-transparent" aria-hidden>
          .
        </p>
      )}

      <BadgeSections badges={timeline.badges.slice(0, frame.shown)} rowClass="animate-reveal" listRef={flipRef} />

      <Scoreboard
        base={Math.round(tween(prev.base, frame.base))}
        multiplier={frame.multiplier}
        total={Math.round(tween(prev.total, frame.total))}
        final={done}
      />
      <p className="sr-only" aria-live="polite">
        {done ? `${season.year} ${season.name}: ${score.total} points` : ""}
      </p>
    </RarityFrame>
  );
}
