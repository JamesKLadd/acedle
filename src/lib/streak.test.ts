import { describe, expect, it } from "vitest";

import { bestStreak, currentStreak } from "./streak";

describe("currentStreak", () => {
  const days = ["2026-10-24", "2026-10-23", "2026-10-22", "2026-10-20"];

  it("counts back from today", () => {
    expect(currentStreak(days, "2026-10-24")).toBe(3);
  });

  it("stays alive until today's roll", () => {
    expect(currentStreak(days, "2026-10-25")).toBe(3);
  });

  it("breaks after a missed day", () => {
    expect(currentStreak(days, "2026-10-26")).toBe(0);
    expect(currentStreak([], "2026-10-26")).toBe(0);
  });

  it("works across months and ignores duplicates", () => {
    expect(currentStreak(["2026-11-01", "2026-10-31", "2026-10-31"], "2026-11-01")).toBe(2);
  });
});

describe("bestStreak", () => {
  it("finds the longest run", () => {
    expect(bestStreak(["2026-10-20", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-01"])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});
