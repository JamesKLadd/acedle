import type { PlayerSeason } from "../data/types";

export type Rng = () => number;

export const MIN_LUCK = 1;
export const MAX_LUCK = 10;

/**
 * Sandbox luck: each player's weight within the season is 1 / rank^k.
 * k = 0 at 1× (uniform, same odds as the daily roll), rising to 1.5 at 10×.
 */
export function luckExponent(luck: number): number {
  const clamped = Math.min(MAX_LUCK, Math.max(MIN_LUCK, luck));
  return (1.5 * (clamped - MIN_LUCK)) / (MAX_LUCK - MIN_LUCK);
}

function pickIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/**
 * Rolls a season: a uniformly random year, then a player from that year's pool.
 * With luck > 1 (sandbox only), better-ranked players become more likely.
 */
export function rollSeason(
  pools: ReadonlyMap<number, readonly PlayerSeason[]>,
  { rng = Math.random, luck = MIN_LUCK }: { rng?: Rng; luck?: number } = {},
): PlayerSeason {
  const years = [...pools.keys()];
  const year = years[Math.floor(rng() * years.length)];
  const pool = pools.get(year)!;
  const k = luckExponent(luck);
  const index = k === 0 ? Math.floor(rng() * pool.length) : pickIndex(pool.map((s) => s.ranking.final ** -k), rng);
  return pool[index];
}

/**
 * Other players from the same season, for the reveal's name reel to flicker
 * through before landing on the real one.
 */
export function decoyNames(
  pools: ReadonlyMap<number, readonly PlayerSeason[]>,
  season: PlayerSeason,
  count = 12,
  rng: Rng = Math.random,
): string[] {
  const others = (pools.get(season.year) ?? []).filter((s) => s.playerId !== season.playerId).map((s) => s.name);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others.slice(0, count);
}
