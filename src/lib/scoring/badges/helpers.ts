import type { EventCategory, PlayerSeason } from "../../data/types";
import type { BadgeAward } from "../types";

/**
 * Global scale for flat points. Badge values are written in small "units"
 * (e.g. pts(50) per title) so their relative weights stay readable; this knob
 * sets the overall size of scores without retuning every badge.
 */
export const POINT_SCALE = 120;

export const pts = (units: number) => units * POINT_SCALE;

export const fmtPts = (units: number) => pts(units).toLocaleString("en-US");

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const titlesIn = (s: PlayerSeason, category: EventCategory) =>
  s.titles.filter((t) => t.category === category).length;

export const wonTitle = (s: PlayerSeason, code: string) => s.titles.some((t) => t.code === code);

export const slamsAt = (s: PlayerSeason, round: string) => s.slams.filter((r) => r.round === round).length;

/** `units` points per occurrence; null when the count is zero. */
export function perEach(count: number, units: number, detail: string): BadgeAward | null {
  return count > 0 ? { points: count * pts(units), count, detail } : null;
}

/** A multiplier applied once per occurrence (`each` ^ count); null when the count is zero. */
export function multEach(count: number, each: number, detail: string): BadgeAward | null {
  return count > 0 ? { multiplier: each ** count, count, detail } : null;
}

/**
 * Cumulative milestone bonuses (in units): every threshold reached adds its bonus.
 * `steps` must be sorted ascending by threshold.
 */
export function milestones(value: number, steps: ReadonlyArray<readonly [threshold: number, bonus: number]>) {
  let units = 0;
  let reached = 0;
  for (const [threshold, bonus] of steps) {
    if (value < threshold) break;
    units += bonus;
    reached++;
  }
  return { points: pts(units), reached };
}

/** Highest matching tier only. `tiers` sorted from strictest to loosest. */
export function bestTier<T>(predicate: (threshold: T) => boolean, tiers: ReadonlyArray<readonly [T, number]>) {
  return tiers.find(([threshold]) => predicate(threshold)) ?? null;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export const rankLabel = (s: PlayerSeason) => (s.live ? "currently" : "year-end");
