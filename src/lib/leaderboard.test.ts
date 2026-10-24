import { describe, expect, it } from "vitest";

import { boardDay, FIRST_DAY, splitBoard } from "./leaderboard";

describe("boardDay", () => {
  const today = "2026-11-05";

  it("accepts past days", () => {
    expect(boardDay("2026-11-01", today)).toBe("2026-11-01");
  });

  it("falls back to today for missing, malformed or future days", () => {
    expect(boardDay(undefined, today)).toBe(today);
    expect(boardDay("yesterday", today)).toBe(today);
    expect(boardDay(["2026-11-01"], today)).toBe(today);
    expect(boardDay("2026-13-45", today)).toBe(today);
    expect(boardDay("2027-01-01", today)).toBe(today);
  });

  it("doesn't go before launch", () => {
    expect(boardDay("2020-01-01", today)).toBe(FIRST_DAY);
  });
});

describe("splitBoard", () => {
  it("separates the top 100 from the viewer's rows below", () => {
    const rows = Array.from({ length: 102 }, (_, i) => ({ is_viewer: i >= 100 }));
    const { top, below } = splitBoard(rows);
    expect(top).toHaveLength(100);
    expect(below).toEqual([{ is_viewer: true }, { is_viewer: true }]);
  });
});
