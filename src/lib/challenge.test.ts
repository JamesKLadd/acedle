import { describe, expect, it } from "vitest";

import { challengeDay, challengeNumber, challengeOutcome, challengeShareText, challengeTier, FIRST_CHALLENGE } from "./challenge";
import { seedDraw, type Entrant } from "./tournament";

const entrant = (i: number, score: number): Omit<Entrant, "seed"> => ({
  playerId: i,
  year: 2000 + i,
  name: `Player ${i}`,
  country: "SUI",
  finalRank: i + 1,
  score,
});
const poolOf = (n: number) => Array.from({ length: n }, (_, i) => entrant(i, (n - i) * 1000));

describe("schedule", () => {
  it("builds the tier through the week to a Grand Slam on Sunday", () => {
    // 2026-10-26 is a Monday.
    const week = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"].map(
      challengeTier,
    );
    expect(week).toEqual(["250", "250", "250", "500", "500", "1000", "slam"]);
    expect(challengeTier("2026-11-02")).toBe("250");
  });

  it("numbers the challenges from the first day", () => {
    expect(challengeNumber(FIRST_CHALLENGE)).toBe(1);
    expect(challengeNumber("2026-10-27")).toBe(2);
    expect(challengeNumber("2026-12-25")).toBe(61);
    // Across a daylight-saving change makes no difference (UTC days).
    expect(challengeNumber("2027-04-01")).toBe(158);
  });
});

describe("challengeOutcome and the share text", () => {
  const slam = seedDraw(poolOf(32), 13, 99, "slam");

  it("tracks a run in progress", () => {
    expect(challengeOutcome(slam, [true, false])).toEqual({
      roundsWon: null,
      champion: false,
      setsWon: 1,
      setsLost: 1,
      label: null,
    });
  });

  it("reports a run that went out, and shares it set by set", () => {
    const sets = [true, true, true, true, false, true, true, false, true, false, false];
    expect(challengeOutcome(slam, sets)).toMatchObject({ roundsWon: 2, champion: false, setsWon: 7, setsLost: 4, label: "Quarterfinals" });
    expect(challengeShareText("2026-11-01", slam, sets, { year: 2009, name: "Marat Safin" })).toBe(
      [
        "Acedle Challenge #7 · Grand Slam",
        "'09 Marat Safin · seed 14 of 32",
        "R32 🟩🟩🟩",
        "R16 🟩🟥🟩🟩",
        "QF 🟥🟩🟥🟥",
        "Quarterfinals",
      ].join("\n"),
    );
  });

  it("crowns a champion and ignores sets after the run", () => {
    const t = seedDraw(poolOf(16), 0, 5, "250");
    const sets = Array<boolean>(8).fill(true);
    expect(challengeOutcome(t, [...sets, false, false])).toMatchObject({ roundsWon: 4, champion: true, setsWon: 8, setsLost: 0 });
    expect(challengeShareText("2026-10-26", t, sets, { year: 2000, name: "Player 0" }).split("\n").at(-1)).toBe("🏆 Champion");
  });
});

describe("challengeDay", () => {
  it("accepts days from the first challenge to today", () => {
    expect(challengeDay("2026-10-30", "2026-11-02")).toBe("2026-10-30");
    expect(challengeDay(FIRST_CHALLENGE, "2026-11-02")).toBe(FIRST_CHALLENGE);
    expect(challengeDay("2026-11-03", "2026-11-02")).toBeNull();
    expect(challengeDay("2026-10-25", "2026-11-02")).toBeNull();
    expect(challengeDay("2026-13-40", "2027-01-01")).toBeNull();
    expect(challengeDay(["2026-10-30"], "2026-11-02")).toBeNull();
    expect(challengeDay(undefined, "2026-11-02")).toBeNull();
  });
});
