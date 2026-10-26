import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { findSeason } from "../data/seasons";
import { scoreSeason } from "../scoring";
import { KNOCKOUTS } from "./calendar";
import { drawSeason, RIVAL_RANKS } from "./draw";
import { NEUTRAL } from "./odds";
import { RIVALS, seasonState } from "./season";

describe("drawSeason", () => {
  const card = findSeason(2008, 104745)!; // Nadal
  const setup = drawSeason(card, scoreSeason(card).total);

  it("draws 40 rivals ranked 1–50, one season per player, never the card's player", () => {
    expect(setup.rivals).toHaveLength(RIVALS);
    expect(new Set(setup.rivals.map((r) => r.playerId)).size).toBe(RIVALS);
    expect(setup.rivals.some((r) => r.playerId === card.playerId)).toBe(false);
    for (const r of setup.rivals) {
      expect(r.finalRank).toBeGreaterThanOrEqual(RIVAL_RANKS[0]);
      expect(r.finalRank).toBeLessThanOrEqual(RIVAL_RANKS[1]);
    }
    const scores = setup.rivals.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("enters the 31 best in every Slam and 15 in every Masters", () => {
    KNOCKOUTS.forEach((event, i) => {
      const entries = setup.entries[i];
      expect(new Set(entries).size).toBe(entries.length);
      if (event.kind === "slam") expect(entries).toEqual([...Array(31).keys()]);
      else expect(entries).toHaveLength(15);
    });
  });

  it("gives the card its court strengths, from the data when an old roll lacks them", () => {
    expect(setup.you.courts.Clay).toBeGreaterThan(1.3);
    const oldRoll = { ...card, matches: { ...card.matches, bySurface: undefined } };
    expect(drawSeason(oldRoll, 1).you.courts).toEqual(setup.you.courts);
    expect(setup.you.courts).not.toEqual(NEUTRAL);
  });

  it("plays out a whole season", () => {
    const lost = KNOCKOUTS.flatMap((e) => Array<boolean>(e.kind === "slam" ? 3 : 2).fill(false));
    const s = seasonState(setup, lost);
    expect(s.done).toBe(true);
    expect(s.race).toHaveLength(RIVALS + 1);
    expect(s.finals.field).toHaveLength(8);
  });
});
