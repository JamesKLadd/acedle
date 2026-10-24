import { describe, expect, it } from "vitest";

import { findSeason, loadSeasons } from "./data/seasons";
import { flag } from "./flags";
import { rankTier, rarityOf } from "./rarity";
import { badgeSections, revealTimeline } from "./reveal";
import { decoyNames } from "./roll";
import { scoreSeason } from "./scoring";

describe("flag", () => {
  it("maps IOC codes, including the ones that differ from ISO", () => {
    expect(flag("SUI")).toBe("🇨🇭");
    expect(flag("GER")).toBe("🇩🇪");
    expect(flag("SRB")).toBe("🇷🇸");
    expect(flag("XXX")).toBe("");
  });

  it("covers every country in the season data", () => {
    const missing = new Set([...loadSeasons().values()].flat().map((s) => s.country).filter((c) => !flag(c)));
    expect([...missing]).toEqual([]);
  });
});

describe("rarity", () => {
  it.each([
    [0.03, "mythic"],
    [0.1, "mythic"],
    [0.8, "legendary"],
    [4.9, "epic"],
    [20, "rare"],
    [60, "common"],
  ])("top %s%% → %s", (p, id) => {
    expect(rarityOf(p).id).toBe(id);
  });

  it("labels top ranks", () => {
    expect(rankTier(1)?.label).toBe("World No. 1");
    expect(rankTier(7)?.label).toBe("Top 10");
    expect(rankTier(55)).toBeNull();
  });
});

describe("badgeSections", () => {
  const score = scoreSeason(findSeason(2015, 104925)!);

  it("lists multipliers then points, biggest first", () => {
    const { multipliers, points } = badgeSections(score.badges);
    expect(multipliers.length + points.length).toBe(score.badges.length);
    expect(multipliers.map((b) => b.multiplier)).toEqual([...multipliers.map((b) => b.multiplier!)].sort((a, b) => b - a));
    expect(points.map((b) => b.points)).toEqual([...points.map((b) => b.points)].sort((a, b) => b - a));
  });

  it("keeps the reveal order itself unchanged (points, then multipliers)", () => {
    const order = revealTimeline(score).badges.map((b) => b.multiplier !== null);
    expect(order.indexOf(true)).toBe(order.lastIndexOf(false) + 1);
  });
});

describe("decoyNames", () => {
  it("picks other players from the same season", () => {
    const pools = loadSeasons();
    const season = findSeason(2015, 104925)!;
    const names = decoyNames(pools, season, 12, () => 0.5);
    expect(names).toHaveLength(12);
    expect(new Set(names).size).toBe(12);
    expect(names).not.toContain(season.name);
    const pool = new Set(pools.get(2015)!.map((s) => s.name));
    expect(names.every((n) => pool.has(n))).toBe(true);
  });
});
