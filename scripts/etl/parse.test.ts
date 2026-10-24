import { describe, expect, it } from "vitest";

import { ageAt, classifyEvent, parseScore, rankedPlayer, setWinner } from "./parse";

describe("classifyEvent", () => {
  it.each([
    ["G", "Wimbledon", "slam"],
    ["M", "Rome Masters", "masters"],
    ["F", "Tour Finals", "finals"],
    ["F", "Next Gen Finals", "excluded"],
    ["A", "NextGen Finals", "excluded"],
    ["A", "Laver Cup", "excluded"],
    ["A", "Grand Slam Cup", "excluded"],
    ["A", "Atp Cup", "team"],
    ["A", "United Cup", "team"],
    ["D", "Davis Cup WG F: CRO vs FRA", "team"],
    ["A", "Rio Olympics", "olympics"],
    ["O", "Paris Olympics", "olympics"],
    ["A", "Halle", "tour"],
  ])("%s %s → %s", (level, name, expected) => {
    expect(classifyEvent(level, name)).toBe(expected);
  });
});

describe("parseScore", () => {
  it("parses sets and tiebreaks", () => {
    const s = parseScore("7-6(5) 4-6 6-0");
    expect(s.sets).toEqual([[7, 6], [4, 6], [6, 0]]);
    expect(s.tiebreak).toEqual([true, false, false]);
    expect(s.walkover).toBe(false);
    expect(s.incomplete).toBe(false);
  });

  it("treats final-set tiebreaks at 12-12 and match tiebreaks as tiebreaks", () => {
    expect(parseScore("6-4 3-6 7-6(3) 4-6 13-12(5)").tiebreak).toEqual([false, false, true, false, true]);
    expect(parseScore("6-4 3-6 [10-7]").tiebreak).toEqual([false, false, true]);
  });

  it("flags walkovers and retirements", () => {
    expect(parseScore("W/O").walkover).toBe(true);
    expect(parseScore("W/O").sets).toEqual([]);
    const ret = parseScore("6-3 2-1 RET");
    expect(ret.incomplete).toBe(true);
    expect(ret.sets).toHaveLength(2);
  });
});

describe("setWinner", () => {
  it("ignores unfinished sets", () => {
    expect(setWinner([6, 4])).toBe("w");
    expect(setWinner([4, 6])).toBe("l");
    expect(setWinner([2, 0])).toBeNull();
  });
});

describe("ageAt", () => {
  it("counts whole years", () => {
    expect(ageAt(19870522, 20151231)).toBe(28);
    expect(ageAt(19870522, 20150521)).toBe(27);
    expect(ageAt(19870522, 20150522)).toBe(28);
  });
});

describe("rankedPlayer", () => {
  it("gives entries from before the player's birth to whoever held the id then", () => {
    // Martin Damm Jr. (102093, born 2003) inherited his father's ranking id.
    expect(rankedPlayer(102093, 19931227, 20030930)).toBe(210013);
    expect(rankedPlayer(102093, 20251229, 20030930)).toBe(102093);
  });

  it("flags entries from before the player's birth with no known owner", () => {
    expect(rankedPlayer(5, 19900101, 19950101, new Map())).toBeNull();
    expect(rankedPlayer(5, 19900101, 19950101, new Map([[5, 6]]))).toBe(6);
    expect(rankedPlayer(5, 19900101, null, new Map())).toBe(5);
  });
});
