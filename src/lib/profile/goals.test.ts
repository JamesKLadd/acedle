import { describe, expect, it } from "vitest";

import { GOALS, goalProgress, medalCount, medalsFromCard, newMedals, type GoalRoll, type GoalSeason } from "./goals";

let n = 0;
const roll = (over: Partial<GoalRoll> = {}): GoalRoll => ({
  id: `r${n++}`,
  year: 2000,
  playerId: 1,
  country: "SUI",
  finalRank: 50,
  hand: "R",
  wonSlam: false,
  tournament: null,
  ...over,
});
const goal = (rolls: GoalRoll[], id: string, seasons: GoalSeason[] = []) =>
  goalProgress(rolls, seasons).find((g) => g.id === id)!;

describe("goalProgress", () => {
  it("has rising levels for every goal", () => {
    for (const g of GOALS) expect(g.levels[0] < g.levels[1] && g.levels[1] < g.levels[2]).toBe(true);
    expect(new Set(GOALS.map((g) => g.id)).size).toBe(GOALS.length);
  });

  it("counts different countries, years and players", () => {
    const rolls = [
      roll({ country: "SUI", year: 2000, playerId: 1 }),
      roll({ country: "ESP", year: 2000, playerId: 2 }),
      roll({ country: "ESP", year: 2001, playerId: 2 }),
    ];
    expect(goal(rolls, "countries").count).toBe(2);
    expect(goal(rolls, "years").count).toBe(2);
    expect(goal(rolls, "players").count).toBe(2);
  });

  it("counts a player-season rolled twice once", () => {
    const fedex = { year: 2006, playerId: 103819, finalRank: 1, wonSlam: true };
    const rolls = [roll(fedex), roll(fedex), roll({ year: 2004, playerId: 103819, finalRank: 1, wonSlam: true })];
    expect(goal(rolls, "no1").count).toBe(2);
    expect(goal(rolls, "slam-winners").count).toBe(2);
    expect(goal(rolls, "top10").count).toBe(2);
  });

  it("gives the medal reached and what the next one needs", () => {
    const countries = (k: number) => Array.from({ length: k }, (_, i) => roll({ country: `C${i}` }));
    expect(goal(countries(9), "countries")).toMatchObject({ count: 9, medal: null, next: 10 });
    expect(goal(countries(10), "countries")).toMatchObject({ medal: "bronze", next: 30 });
    expect(goal(countries(50), "countries")).toMatchObject({ medal: "gold", next: null });
  });

  it("counts tournament titles, the tiers won and titles without a set dropped", () => {
    const won = (tier: "250" | "500" | "1000" | "slam" | null, setsLost = 0) =>
      roll({ tournament: { tier, roundsWon: tier === "slam" ? 5 : 4, setsLost } });
    const rolls = [
      won("250", 1),
      won("250"),
      won("slam", 2),
      won(null),
      // Out in the semifinals: no title.
      roll({ tournament: { tier: "1000", roundsWon: 2, setsLost: 2 } }),
    ];
    expect(goal(rolls, "champion").count).toBe(4);
    // Tournaments from before tiers count as titles, not as a tier.
    expect(goal(rolls, "every-tier")).toMatchObject({ count: 2, medal: "bronze" });
    expect(goal(rolls, "flawless").count).toBe(2);
  });

  it("counts season-mode titles in every season and seasons finished", () => {
    const seasons: GoalSeason[] = [
      { rollId: "a", status: "finished", titles: 4 },
      { rollId: "b", status: "abandoned", titles: 2 },
      { rollId: "c", status: "active", titles: 1 },
    ];
    expect(goal([], "season-titles", seasons)).toMatchObject({ count: 7, medal: "bronze" });
    expect(goal([], "seasons", seasons)).toMatchObject({ count: 1, medal: "bronze" });
  });
});

describe("medals", () => {
  it("counts each level reached", () => {
    const rolls = Array.from({ length: 10 }, (_, i) => roll({ country: `C${i}`, year: 1990 + i, playerId: i }));
    // Countries and years at bronze; nothing else.
    expect(medalCount(goalProgress(rolls, []))).toBe(2);
    expect(medalCount(goalProgress([], [{ rollId: "x", status: "finished", titles: 10 }]))).toBe(3);
  });

  it("finds the medals a card brought, with its tournament and seasons", () => {
    const earlier = Array.from({ length: 9 }, (_, i) => roll({ country: `C${i}`, year: 2000 + i, playerId: i }));
    const today = roll({ id: "today", country: "NEW", year: 2000, playerId: 99, tournament: { tier: "250", roundsWon: 4, setsLost: 0 } });
    const seasons: GoalSeason[] = [{ rollId: "today", status: "active", titles: 1 }];
    const got = medalsFromCard("today", [...earlier, today], seasons).map((m) => `${m.goal.id}:${m.medal}`);
    expect(got).toEqual(["countries:bronze", "champion:bronze", "flawless:bronze", "season-titles:bronze"]);
    // Nothing new without the card.
    expect(medalsFromCard("today", earlier, [])).toEqual([]);
  });

  it("reports only the best new medal of a goal", () => {
    const before = goalProgress([], []);
    const after = goalProgress([], [{ rollId: "x", status: "finished", titles: 30 }]);
    expect(newMedals(before, after).map((m) => `${m.goal.id}:${m.medal}`)).toEqual(["season-titles:gold", "seasons:bronze"]);
  });
});
