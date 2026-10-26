// Regression checks of the built data against well-known seasons.

import { describe, expect, it } from "vitest";

import { loadSeasons } from "./seasons";
import type { PlayerSeason } from "./types";
import { POOL_SIZE, ROLLABLE_YEARS } from "./years";

const season = (year: number, name: string): PlayerSeason => {
  const s = loadSeasons()
    .get(year)!
    .find((p) => p.name === name);
  if (!s) throw new Error(`${name} ${year} not in pool`);
  return s;
};

const count = (s: PlayerSeason, category: string) => s.titles.filter((t) => t.category === category).length;

describe("season data", () => {
  it("has a full pool for every rollable year", () => {
    for (const y of ROLLABLE_YEARS) {
      const pool = loadSeasons().get(y)!;
      expect(pool).toHaveLength(POOL_SIZE);
      expect(pool.map((p) => p.ranking.final)).toEqual([...pool.map((p) => p.ranking.final)].sort((a, b) => a - b));
    }
  });

  it("Djokovic 2015", () => {
    const s = season(2015, "Novak Djokovic");
    expect(s.ranking.final).toBe(1);
    expect(s.titles).toHaveLength(11);
    expect(count(s, "slam")).toBe(3);
    expect(count(s, "masters")).toBe(6);
    expect(count(s, "finals")).toBe(1);
    expect([s.matches.wins, s.matches.losses]).toEqual([82, 6]);
    expect(s.ranking.weeksAtNo1).toBe(52);
  });

  it("Djokovic 2011 win streak", () => {
    expect(season(2011, "Novak Djokovic").matches.longestStreak).toBe(41);
  });

  it("Federer 2006", () => {
    const s = season(2006, "Roger Federer");
    expect(s.titles).toHaveLength(12);
    expect([s.matches.wins, s.matches.losses]).toEqual([92, 5]);
  });

  it("Murray 2016 Olympic gold and Tour Finals", () => {
    const s = season(2016, "Andy Murray");
    expect(count(s, "olympics")).toBe(1);
    expect(count(s, "finals")).toBe(1);
    expect(s.titles).toHaveLength(9);
  });

  it("Edberg 1990 has points from the last list that published them", () => {
    const s = season(1990, "Stefan Edberg");
    expect(s.ranking.finalPoints).toBeGreaterThan(0);
    expect(s.serve).toBeNull();
  });

  it("Isner 2010 Wimbledon marathon", () => {
    expect(season(2010, "John Isner").matches.longestWinMinutes).toBe(665);
  });

  it("has plausible ages (a reassigned ranking id shows up as a negative one)", () => {
    for (const s of [...loadSeasons().values()].flat()) {
      if (s.age !== null) expect(s.age, `${s.year} ${s.name}`).toBeGreaterThanOrEqual(15);
    }
  });

  it("Martin Damm Sr. 1993, whom the rankings list under his son's id", () => {
    const s = season(1993, "Martin Damm Sr");
    expect(s.playerId).toBe(210013);
    expect([s.country, s.hand, s.age]).toEqual(["CZE", "R", 21]);
    expect([s.matches.wins, s.matches.losses]).toEqual([16, 22]);
  });

  it("splits every season's wins and losses by surface", () => {
    for (const s of [...loadSeasons().values()].flat()) {
      const records = Object.values(s.matches.bySurface ?? {});
      const sum = (k: "wins" | "losses") => records.reduce((n, r) => n + r[k], 0);
      expect([sum("wins"), sum("losses")], `${s.year} ${s.name}`).toEqual([s.matches.wins, s.matches.losses]);
    }
  });

  it("Nadal 2008 on clay and Sampras 1995 on clay and grass", () => {
    expect(season(2008, "Rafael Nadal").matches.bySurface?.Clay).toEqual({ wins: 24, losses: 1 });
    const sampras = season(1995, "Pete Sampras").matches.bySurface;
    expect([sampras?.Clay, sampras?.Grass]).toEqual([
      { wins: 7, losses: 5 },
      { wins: 12, losses: 0 },
    ]);
  });

  it("canonicalizes title codes across padding changes", () => {
    expect(season(2025, "Jannik Sinner").defendedTitles).toEqual(expect.arrayContaining(["580", "605"]));
  });
});
