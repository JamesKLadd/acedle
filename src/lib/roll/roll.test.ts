import { describe, expect, it } from "vitest";

import { loadSeasons } from "../data/seasons";
import { luckExponent, rollSeason } from "./index";

/** Deterministic PRNG (mulberry32) so the distribution checks are stable. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pools = loadSeasons();

describe("rollSeason", () => {
  it("returns a season from the pools", () => {
    const s = rollSeason(pools, { rng: seeded(1) });
    expect(pools.get(s.year)).toContain(s);
  });

  it("is uniform over years and players at 1× luck", () => {
    const rng = seeded(42);
    const years = new Map<number, number>();
    let no1 = 0;
    const N = 74_000;
    for (let i = 0; i < N; i++) {
      const s = rollSeason(pools, { rng });
      years.set(s.year, (years.get(s.year) ?? 0) + 1);
      if (s.ranking.final === 1) no1++;
    }
    const expectedPerYear = N / pools.size;
    for (const count of years.values()) expect(Math.abs(count - expectedPerYear) / expectedPerYear).toBeLessThan(0.1);
    expect(no1 / N).toBeGreaterThan(0.008);
    expect(no1 / N).toBeLessThan(0.012);
  });

  it("favours better-ranked players as luck rises", () => {
    const avgRank = (luck: number) => {
      const rng = seeded(7);
      let sum = 0;
      for (let i = 0; i < 5000; i++) sum += rollSeason(pools, { rng, luck }).ranking.final;
      return sum / 5000;
    };
    const [r1, r5, r10] = [avgRank(1), avgRank(5), avgRank(10)];
    expect(r1).toBeGreaterThan(r5);
    expect(r5).toBeGreaterThan(r10);
  });

  it("clamps luck into range", () => {
    expect(luckExponent(0)).toBe(0);
    expect(luckExponent(1)).toBe(0);
    expect(luckExponent(10)).toBe(1.5);
    expect(luckExponent(99)).toBe(1.5);
  });
});
