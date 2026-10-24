import { describe, expect, it } from "vitest";

import { loadSeasons } from "../data/seasons";
import type { PlayerSeason } from "../data/types";
import { BADGES, MULTIPLIER_CAP, scoreSeason } from "./index";
import type { BadgeDef } from "./types";

const season = (year: number, name: string): PlayerSeason => {
  const s = loadSeasons()
    .get(year)!
    .find((p) => p.name === name);
  if (!s) throw new Error(`${name} ${year} not in pool`);
  return s;
};

const ids = (s: PlayerSeason) => scoreSeason(s).badges.map((b) => b.id);
const badge = (s: PlayerSeason, id: string) => scoreSeason(s).badges.find((b) => b.id === id);

describe("badge catalogue", () => {
  it("has unique ids", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });

  it("never throws and always awards non-negative points across every season", () => {
    for (const pool of loadSeasons().values()) {
      for (const s of pool) {
        const r = scoreSeason(s);
        expect(r.total).toBeGreaterThanOrEqual(0);
        for (const b of r.badges) expect(b.points).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("scoreSeason", () => {
  it("Djokovic 2015 hits the jackpot badges", () => {
    const s = season(2015, "Novak Djokovic");
    const r = scoreSeason(s);
    expect(ids(s)).toEqual(
      expect.arrayContaining(["slam_champion", "masters_champion", "tour_finals_champion", "year_end_no1", "triple_crown", "big_title_sweep"]),
    );
    expect(badge(s, "slam_champion")?.multiplier).toBeCloseTo(1.4 ** 3);
    expect(badge(s, "titlist")?.count).toBe(11);
    const product = r.badges.reduce((m, b) => m * (b.multiplier ?? 1), 1);
    expect(r.multiplier).toBeCloseTo(product);
    expect(r.total).toBe(Math.round(r.base * r.multiplier));
    // The very best seasons land around 100 million.
    expect(r.total).toBeGreaterThan(50_000_000);
    expect(r.total).toBeLessThan(200_000_000);
  });

  it("Djokovic 2011 is Unstoppable", () => {
    expect(badge(season(2011, "Novak Djokovic"), "unstoppable")?.multiplier).toBe(2);
  });

  it("Nadal 2010 earns the Channel Slam", () => {
    expect(ids(season(2010, "Rafael Nadal"))).toContain("channel_slam");
  });

  it("Murray 2016 earns Olympic gold and the Golden Season", () => {
    const s = season(2016, "Andy Murray");
    expect(ids(s)).toEqual(expect.arrayContaining(["olympic_gold", "golden_season"]));
  });

  it("skips serve badges for 1990, when serve stats were not recorded", () => {
    const pool = loadSeasons().get(1990)!;
    for (const s of pool) {
      expect(ids(s).some((id) => ["ace_machine", "big_server", "clutch", "hold_steady"].includes(id))).toBe(false);
    }
  });

  it("puts multiplier badges after points badges", () => {
    const badges = scoreSeason(season(2015, "Novak Djokovic")).badges;
    const firstMult = badges.findIndex((b) => b.multiplier !== null);
    expect(badges.slice(firstMult).every((b) => b.multiplier !== null)).toBe(true);
  });

  it("caps the multiplier", () => {
    const huge: BadgeDef[] = [
      { id: "a", name: "A", category: "jackpot", description: "", evaluate: () => ({ multiplier: 50, detail: "" }) },
      { id: "b", name: "B", category: "jackpot", description: "", evaluate: () => ({ multiplier: 50, detail: "" }) },
      { id: "c", name: "C", category: "titles", description: "", evaluate: () => ({ points: 10, detail: "" }) },
    ];
    const r = scoreSeason(season(2015, "Novak Djokovic"), huge);
    expect(r.multiplier).toBe(MULTIPLIER_CAP);
    expect(r.total).toBe(10 * MULTIPLIER_CAP);
  });
});
