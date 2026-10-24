// Timeline for the roll reveal: the year spins and lands, the player appears,
// then the points badges drop in one by one (building the base), then the
// multipliers (each multiplying the total). Pure: the component only maps
// elapsed time to a frame.

import type { EarnedBadge, ScoreResult } from "./scoring/types";

export const YEAR_SPIN_MS = 1300;
export const PLAYER_MS = 1500;
/** Points badges share this much time, within the per-badge bounds below. */
const POINTS_BUDGET_MS = 2400;
const POINTS_STEP_MIN_MS = 150;
const POINTS_STEP_MAX_MS = 400;
const PAUSE_BEFORE_MULTIPLIERS_MS = 500;
const MULTIPLIER_STEP_MS = 700;
const END_MS = 400;

export interface RevealFrame {
  /** Milliseconds after the reveal starts. */
  at: number;
  /** How many badges (in reveal order) are visible. */
  shown: number;
  base: number;
  multiplier: number;
  total: number;
}

export interface RevealTimeline {
  /** Points badges first, then multipliers. */
  badges: EarnedBadge[];
  /** When the spinning year lands. */
  yearAt: number;
  /** When the player appears. */
  playerAt: number;
  /** One frame per badge, after an empty frame at `playerAt`. */
  frames: RevealFrame[];
  doneAt: number;
}

export function revealTimeline(score: ScoreResult): RevealTimeline {
  const points = score.badges.filter((b) => b.multiplier === null);
  const multipliers = score.badges.filter((b) => b.multiplier !== null);
  const step = Math.min(
    POINTS_STEP_MAX_MS,
    Math.max(POINTS_STEP_MIN_MS, POINTS_BUDGET_MS / Math.max(points.length, 1)),
  );

  const yearAt = YEAR_SPIN_MS;
  const playerAt = yearAt + PLAYER_MS;
  const frames: RevealFrame[] = [{ at: playerAt, shown: 0, base: 0, multiplier: 1, total: 0 }];
  let t = playerAt;
  let base = 0;
  let multiplier = 1;
  for (const b of points) {
    t += step;
    base += b.points;
    frames.push({ at: t, shown: frames.length, base, multiplier, total: base });
  }
  if (multipliers.length > 0) t += PAUSE_BEFORE_MULTIPLIERS_MS;
  for (const b of multipliers) {
    t += MULTIPLIER_STEP_MS;
    multiplier *= b.multiplier!;
    frames.push({ at: t, shown: frames.length, base, multiplier, total: Math.round(base * multiplier) });
  }

  // Land exactly on the stored result (which applies the multiplier cap).
  const last = frames.length - 1;
  frames[last] = { ...frames[last], base: score.base, multiplier: score.multiplier, total: score.total };

  return { badges: [...points, ...multipliers], yearAt, playerAt, frames, doneAt: t + END_MS };
}

/** Index of the latest frame at `elapsed` ms (0 before the player appears). */
export function frameIndexAt(timeline: RevealTimeline, elapsed: number): number {
  let i = 0;
  while (i + 1 < timeline.frames.length && timeline.frames[i + 1].at <= elapsed) i++;
  return i;
}

/**
 * How a roll's badges are listed: multipliers first, then points, each from
 * biggest to smallest (ties keep their reveal order).
 */
export function badgeSections(badges: readonly EarnedBadge[]) {
  const multipliers = badges.filter((b) => b.multiplier !== null).sort((a, b) => b.multiplier! - a.multiplier!);
  const points = badges.filter((b) => b.multiplier === null).sort((a, b) => b.points - a.points);
  return { multipliers, points };
}
