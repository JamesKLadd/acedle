import { describe, expect, it } from "vitest";

import { findSeason } from "./data/seasons";
import { fmtTopPercent } from "./format";
import { scoreSeason } from "./scoring";
import { seasonTotals, topPercent } from "./scoring/distribution";
import { shareText, tournamentLine } from "./share";

describe("topPercent", () => {
  const totals = [10, 20, 20, 30, 40];

  it("is the share of seasons scoring at least as well", () => {
    expect(topPercent(40, totals)).toBe(20);
    expect(topPercent(20, totals)).toBe(80);
    expect(topPercent(10, totals)).toBe(100);
    expect(topPercent(25, totals)).toBe(40);
  });

  it("never drops below one season for scores above the best", () => {
    expect(topPercent(999, totals)).toBe(20);
  });

  it("puts the best real season in the top 0.03%", () => {
    const totalsAll = seasonTotals();
    expect(totalsAll).toHaveLength(3700);
    expect(topPercent(totalsAll.at(-1)!)).toBeCloseTo(100 / 3700);
    expect(topPercent(totalsAll[0])).toBe(100);
  });
});

describe("fmtTopPercent", () => {
  it.each([
    [0.027, "top 0.03%"],
    [0.5, "top 0.5%"],
    [4.21, "top 4.2%"],
    [48.6, "top 49%"],
    [100, "top 100%"],
  ])("%s → %s", (p, expected) => {
    expect(fmtTopPercent(p)).toBe(expected);
  });
});

describe("shareText", () => {
  it("summarizes the roll in four lines", () => {
    const season = findSeason(2015, 104925)!;
    const score = scoreSeason(season);
    const text = shareText({ day: "2026-10-24", season, score, topPercent: 0.027 });
    const lines = text.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe("Acedle Oct 24, 2026");
    expect(lines[1]).toBe("2015 Novak Djokovic (#1)");
    expect([...new Intl.Segmenter().segment(lines[2].split(" ")[0])]).toHaveLength(score.badges.length);
    expect(lines[2]).toMatch(/^🏆.* ×\d+(\.\d+)?$/u);
    expect(lines[3]).toBe(`${score.total.toLocaleString("en-US")} pts · top 0.03%`);
  });

  it("handles a roll without badges", () => {
    const season = findSeason(2015, 104925)!;
    const text = shareText({
      day: "2026-10-24",
      season,
      score: { version: 1, badges: [], base: 0, multiplier: 1, total: 0 },
      topPercent: 100,
    });
    expect(text.split("\n")[2]).toBe("—");
  });
});

describe("tournamentLine", () => {
  it.each([
    [4, "🏆 Won the tournament"],
    [3, "🥈 Tournament: runner-up"],
    [2, "🎾 Tournament: out in the semifinal"],
    [0, "🎾 Tournament: out in the round of 16"],
  ])("%s rounds won → %s", (roundsWon, line) => {
    expect(tournamentLine(roundsWon)).toBe(line);
  });
});
