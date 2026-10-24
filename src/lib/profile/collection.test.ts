import { describe, expect, it } from "vitest";

import { loadSeasons } from "../data/seasons";
import { BADGES } from "../scoring";
import type { BadgeDef } from "../scoring/types";
import { badgeCollection, playerDex, poolTotals, summarizeRolls, type RollSummary } from "./collection";

const roll = (over: Partial<RollSummary>): RollSummary => ({
  id: "r",
  day: "2026-10-24",
  year: 2015,
  playerId: 104925,
  playerName: "Novak Djokovic",
  country: "SRB",
  finalRank: 1,
  score: 100,
  ...over,
});

describe("summarizeRolls", () => {
  it("totals rolls and finds the best one", () => {
    const rolls = [roll({ id: "a", score: 10 }), roll({ id: "b", score: 300 }), roll({ id: "c", score: 20 })];
    expect(summarizeRolls(rolls)).toEqual({ count: 3, total: 330, best: rolls[1] });
  });

  it("handles no rolls", () => {
    expect(summarizeRolls([])).toEqual({ count: 0, total: 0, best: null });
  });
});

describe("badgeCollection", () => {
  const defs = [
    { id: "a", name: "A", category: "titles", description: "da", evaluate: () => null },
    { id: "b", name: "B", category: "serve", description: "db", evaluate: () => null },
    { id: "c", name: "C", category: "titles", description: "dc", hidden: true, evaluate: () => null },
  ] satisfies BadgeDef[];

  it("groups every badge by category and marks the earned ones", () => {
    const c = badgeCollection(defs, [
      { badge_id: "c", times_earned: 2, first_day: "2026-10-20" },
      { badge_id: "retired", times_earned: 1, first_day: "2026-10-01" },
    ]);
    expect(c.collected).toBe(1);
    expect(c.total).toBe(3);
    expect(c.groups.map((g) => [g.label, g.badges.map((b) => [b.id, b.timesEarned])])).toEqual([
      ["Titles", [["a", 0], ["c", 2]]],
      ["Serve", [["b", 0]]],
    ]);
    expect(c.groups[0].badges[1]).toMatchObject({ hidden: true, firstDay: "2026-10-20" });
  });

  it("covers the real badge set", () => {
    const c = badgeCollection(BADGES, []);
    expect(c.total).toBe(BADGES.length);
    expect(c.groups.flatMap((g) => g.badges)).toHaveLength(BADGES.length);
  });
});

describe("playerDex", () => {
  it("collects distinct players and seasons", () => {
    const dex = playerDex([
      roll({ year: 2015, finalRank: 1 }),
      roll({ year: 2011, finalRank: 1 }),
      roll({ year: 2015, finalRank: 1 }),
      roll({ year: 2006, playerId: 103819, playerName: "Roger Federer", country: "SUI", finalRank: 1 }),
      roll({ year: 2005, playerId: 104925, finalRank: 78 }),
    ]);
    expect(dex.players.map((p) => [p.name, p.years, p.bestRank])).toEqual([
      ["Novak Djokovic", [2005, 2011, 2015], 1],
      ["Roger Federer", [2006], 1],
    ]);
    expect(dex.seasons).toBe(4);
    expect(dex.rollsPerYear.get(2015)).toBe(2);
    expect(dex.rollsPerYear.get(1990)).toBeUndefined();
  });
});

describe("poolTotals", () => {
  it("counts what can be rolled", () => {
    const t = poolTotals(loadSeasons());
    expect(t.seasons).toBe(3700);
    expect(t.years).toHaveLength(37);
    expect(t.years[0]).toBe(1990);
    expect(t.players).toBeGreaterThan(500);
  });
});
