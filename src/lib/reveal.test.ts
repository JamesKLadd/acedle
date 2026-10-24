import { describe, expect, it } from "vitest";

import { findSeason } from "./data/seasons";
import { frameIndexAt, revealTimeline } from "./reveal";
import { scoreSeason } from "./scoring";
import type { ScoreResult } from "./scoring/types";

const djokovic2015 = scoreSeason(findSeason(2015, 104925)!);

describe("revealTimeline", () => {
  const tl = revealTimeline(djokovic2015);

  it("reveals points badges before multipliers", () => {
    const firstMultiplier = tl.badges.findIndex((b) => b.multiplier !== null);
    expect(firstMultiplier).toBeGreaterThan(0);
    expect(tl.badges.slice(firstMultiplier).every((b) => b.multiplier !== null)).toBe(true);
    expect(tl.badges).toHaveLength(djokovic2015.badges.length);
  });

  it("builds the base, then multiplies it", () => {
    const pointsEnd = tl.frames.find((f) => f.shown === tl.badges.findIndex((b) => b.multiplier !== null))!;
    expect(pointsEnd.base).toBe(djokovic2015.base);
    expect(pointsEnd.total).toBe(djokovic2015.base);
    for (let i = 1; i < tl.frames.length; i++) {
      expect(tl.frames[i].at).toBeGreaterThan(tl.frames[i - 1].at);
      expect(tl.frames[i].total).toBeGreaterThanOrEqual(tl.frames[i - 1].total);
      expect(tl.frames[i].shown).toBe(i);
    }
  });

  it("ends exactly on the stored score", () => {
    expect(tl.frames.at(-1)).toMatchObject({
      shown: djokovic2015.badges.length,
      base: djokovic2015.base,
      multiplier: djokovic2015.multiplier,
      total: djokovic2015.total,
    });
    expect(tl.doneAt).toBeGreaterThan(tl.frames.at(-1)!.at);
  });

  it("orders the stages: year, player, badges", () => {
    expect(tl.yearAt).toBeLessThan(tl.playerAt);
    expect(tl.frames[0]).toMatchObject({ at: tl.playerAt, shown: 0, total: 0 });
  });

  it("keeps long reveals short", () => {
    // Even the best seasons reveal in well under 15 seconds.
    expect(tl.doneAt).toBeLessThan(15_000);
  });

  it("handles a roll with no badges", () => {
    const empty: ScoreResult = { version: 1, badges: [], base: 0, multiplier: 1, total: 0 };
    const t = revealTimeline(empty);
    expect(t.frames).toEqual([{ at: t.playerAt, shown: 0, base: 0, multiplier: 1, total: 0 }]);
  });
});

describe("frameIndexAt", () => {
  const tl = revealTimeline(djokovic2015);

  it("finds the latest frame", () => {
    expect(frameIndexAt(tl, 0)).toBe(0);
    expect(frameIndexAt(tl, tl.frames[3].at)).toBe(3);
    expect(frameIndexAt(tl, tl.frames[3].at + 1)).toBe(3);
    expect(frameIndexAt(tl, Infinity)).toBe(tl.frames.length - 1);
  });
});
