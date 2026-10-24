import { describe, expect, it } from "vitest";

import { loadSeasons } from "../../src/lib/data/seasons";
import { chunks, playerRows, playerSeasonRow, ymdToIso } from "./rows";

const seasons = [...loadSeasons().values()].flat();

describe("ymdToIso", () => {
  it("formats YYYYMMDD dates", () => {
    expect(ymdToIso(20151228)).toBe("2015-12-28");
    expect(ymdToIso(20260608)).toBe("2026-06-08");
  });

  it("rejects malformed dates", () => {
    expect(() => ymdToIso(2015122)).toThrow();
  });
});

describe("playerRows", () => {
  const rows = playerRows(seasons);

  it("has one row per player", () => {
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.length).toBe(new Set(seasons.map((s) => s.playerId)).size);
  });

  it("uses each player's latest season", () => {
    const djokovic = rows.find((r) => r.id === 104925);
    expect(djokovic).toMatchObject({ name: "Novak Djokovic", country: "SRB", hand: "R" });
  });
});

describe("playerSeasonRow", () => {
  it("keeps the full season as stats", () => {
    const s = seasons.find((x) => x.year === 2015 && x.playerId === 104925)!;
    expect(playerSeasonRow(s)).toEqual({
      year: 2015,
      player_id: 104925,
      final_rank: 1,
      stats: s,
      data_as_of: "2015-12-28",
    });
  });
});

describe("chunks", () => {
  it("splits into batches", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 3)).toEqual([]);
  });
});
