import type { EventCategory, PlayerSeason } from "../../data/types";
import type { BadgeAward } from "../types";

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const titlesIn = (s: PlayerSeason, category: EventCategory) =>
  s.titles.filter((t) => t.category === category).length;

export const wonTitle = (s: PlayerSeason, code: string) => s.titles.some((t) => t.code === code);

export const slamsAt = (s: PlayerSeason, round: string) => s.slams.filter((r) => r.round === round).length;

/** `unit` points per occurrence; null when the count is zero. */
export function perEach(count: number, unit: number, detail: string): BadgeAward | null {
  return count > 0 ? { points: count * unit, count, detail } : null;
}

/**
 * Cumulative milestone bonuses: every threshold reached adds its bonus.
 * `steps` must be sorted ascending by threshold.
 */
export function milestones(value: number, steps: ReadonlyArray<readonly [threshold: number, bonus: number]>) {
  let points = 0;
  let reached = 0;
  for (const [threshold, bonus] of steps) {
    if (value < threshold) break;
    points += bonus;
    reached++;
  }
  return { points, reached };
}

/** Highest matching tier only. `tiers` sorted from strictest to loosest. */
export function bestTier<T>(predicate: (threshold: T) => boolean, tiers: ReadonlyArray<readonly [T, number]>) {
  return tiers.find(([threshold]) => predicate(threshold)) ?? null;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export const rankLabel = (s: PlayerSeason) => (s.live ? "currently" : "year-end");
