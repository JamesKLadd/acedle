import { describe, expect, it } from "vitest";

import {
  addDaysYmd,
  knownTourneys,
  latestPoints,
  mondayOf,
  normName,
  normalizeTmlMatches,
  parseTennisAbstractRankings,
  playerMatcher,
  publishedList,
  rankObservations,
  reconstructList,
  resolveTmlPlayers,
  syntheticId,
  tourneyCode,
  type PlayerInfo,
  type Row,
} from "./live";

const sackmann = new Map<number, PlayerInfo>([
  [104925, { name: "Novak Djokovic", hand: "R", dob: 19870522, country: "SRB", heightCm: 188 }],
  [106421, { name: "Felix Auger-Aliassime", hand: "R", dob: 20000808, country: "CAN", heightCm: 193 }],
  [1, { name: "John Smith", hand: "R", dob: 19700101, country: "USA", heightCm: null }],
  [2, { name: "John Smith", hand: "L", dob: 19800101, country: "GBR", heightCm: null }],
]);

describe("names and dates", () => {
  it("normalizes names across sources", () => {
    expect(normName("Félix Auger-Aliassime")).toBe(normName("Felix Auger Aliassime"));
    expect(normName("Stan Wawrinka")).toBe("stanwawrinka");
  });

  it("finds the Monday of a week", () => {
    expect(mondayOf(20261019)).toBe(20261019); // Monday
    expect(mondayOf(20261024)).toBe(20261019); // Saturday
    expect(mondayOf(20261025)).toBe(20261019); // Sunday
    expect(mondayOf(20260101)).toBe(20251229); // across the year
    expect(addDaysYmd(20261228, 7)).toBe(20270104);
  });

  it("gives unknown players a stable id far from Sackmann's", () => {
    expect(syntheticId("J0DZ")).toBe(syntheticId("J0DZ"));
    expect(syntheticId("J0DZ")).toBeGreaterThan(2_000_000);
    expect(syntheticId("J0DZ")).not.toBe(syntheticId("J0E0"));
  });

  it("reads tournament codes with or without zero padding", () => {
    expect(tourneyCode("2026-0410")).toBe("410");
    expect(tourneyCode("2026-410")).toBe("410");
    expect(tourneyCode("2026-M-DC-2026-QLS")).toBe("M-DC-2026-QLS");
  });
});

describe("player matching", () => {
  const match = playerMatcher(sackmann);

  it("matches by name and birth date, then by a unique name", () => {
    expect(match("Felix Auger Aliassime", 20000808)).toBe(106421);
    expect(match("Novak Djokovic", null)).toBe(104925);
    expect(match("John Smith", 19800101)).toBe(2);
    expect(match("John Smith", null)).toBeNull(); // ambiguous
    expect(match("Nobody", 20000101)).toBeNull();
  });

  it("resolves TML codes, adding players Sackmann doesn't know", () => {
    const { ids, added } = resolveTmlPlayers(
      [
        { id: "D643", player: "Novak Djokovic", birthdate: "19870522", hand: "R", height: "188", ioc: "SRB" },
        { id: "J0DZ", player: "Rafael Jodar", birthdate: "20060917", hand: "R", height: "191", ioc: "ESP" },
      ],
      sackmann,
    );
    expect(ids.get("D643")).toBe(104925);
    expect(ids.get("J0DZ")).toBe(syntheticId("J0DZ"));
    expect(added.get(syntheticId("J0DZ"))).toEqual({
      name: "Rafael Jodar",
      hand: "R",
      dob: 20060917,
      country: "ESP",
      heightCm: 191,
    });
  });
});

const tml = (over: Partial<Row>): Row => ({
  tourney_id: "2026-410",
  tourney_name: "Monte Carlo",
  tourney_level: "M",
  tourney_date: "20260406",
  round: "R32",
  winner_id: "D643",
  loser_id: "J0DZ",
  winner_rank: "4",
  winner_rank_points: "5000",
  loser_rank: "40",
  loser_rank_points: "1100",
  score: "6-4 6-4",
  ...over,
});

describe("normalizeTmlMatches", () => {
  const ids = new Map([
    ["D643", 104925],
    ["J0DZ", 2_000_001],
  ]);
  const known = knownTourneys([
    { tourney_id: "2025-0410", tourney_name: "Monte Carlo Masters", tourney_level: "M" },
    { tourney_id: "2025-6242", tourney_name: "Winston-Salem", tourney_level: "A" },
  ]);

  it("uses Sackmann ids, the tournament start date and Sackmann's name and level", () => {
    const rows = normalizeTmlMatches(
      [
        tml({ tourney_date: "20260408", round: "R16" }),
        tml({ tourney_date: "20260406" }),
        tml({ tourney_id: "2026-6242", tourney_name: "Winston-Salem", tourney_level: "M", tourney_date: "20260824" }),
        tml({ tourney_id: "2026-9999", tourney_name: "New Event", tourney_level: "500", tourney_date: "20260901" }),
      ],
      ids,
      known,
    );
    expect(rows.map((r) => [r.tourney_name, r.tourney_level, r.tourney_date, r.winner_id, r.loser_id])).toEqual([
      ["Monte Carlo Masters", "M", "20260406", "104925", "2000001"],
      ["Monte Carlo Masters", "M", "20260406", "104925", "2000001"],
      ["Winston-Salem", "A", "20260824", "104925", "2000001"],
      ["New Event", "A", "20260901", "104925", "2000001"],
    ]);
  });

  it("drops duplicates and matches with unknown players", () => {
    const rows = normalizeTmlMatches([tml({}), tml({}), tml({ loser_id: "ZZZZ" })], ids, known);
    expect(rows).toHaveLength(1);
  });
});

describe("rankings", () => {
  const rows = [
    tml({ tourney_date: "20260406", winner_id: "1", loser_id: "2", winner_rank: "1", loser_rank: "3", winner_rank_points: "9000", loser_rank_points: "5000" }),
    tml({ tourney_date: "20260413", winner_id: "3", loser_id: "2", winner_rank: "2", loser_rank: "4", winner_rank_points: "6000", loser_rank_points: "4500" }),
    tml({ tourney_date: "20260414", winner_id: "4", loser_id: "5", winner_rank: "3", loser_rank: "", winner_rank_points: "4800", loser_rank_points: "" }),
  ];
  const obs = rankObservations(rows);

  it("records each player's rank at each tournament week", () => {
    expect(obs).toContainEqual({ player: 2, listDate: 20260413, rank: 4, points: 4500 });
    expect(obs.some((o) => o.player === 5)).toBe(false); // unranked
  });

  it("reconstructs a list from the latest rank of each player", () => {
    expect(reconstructList(obs, 20260406)).toEqual([
      { rank: 1, player: 1, points: 9000 },
      { rank: 2, player: 2, points: 5000 },
    ]);
    // Week of the 13th: player 3 at #2, player 4 at #3, player 2 dropped to #4.
    expect(reconstructList(obs, 20260413).map((e) => e.player)).toEqual([1, 3, 4, 2]);
  });

  it("finds the latest points", () => {
    expect(latestPoints(obs, 20260413).get(2)).toBe(4500);
    expect(latestPoints(obs, 20260406).get(2)).toBe(5000);
  });
});

describe("Tennis Abstract rankings", () => {
  const html = `<p>Updated weekly.  Last update: 2026-10-19</p>
<table id="reportable"><thead><tr><th>Rank</th><th>Player</th><th>Country</th><th>Birthdate</th></tr></thead></tbody>
<tr><td align="right">1</td><td align="left"><a href="x?p=JannikSinner">Jannik&nbsp;Sinner</a></td><td align="left">ITA</td><td align="left">2001-08-16</td></tr>
<tr><td align="right">7</td><td align="left"><a href="x?p=Felix">Felix&nbsp;Auger&nbsp;Aliassime</a></td><td align="left">CAN</td><td align="left">2000-08-08</td></tr>
<tr><td align="right">8</td><td align="left"><a href="x">O&#39;Connell</a></td><td align="left">AUS</td><td align="left"></td></tr>`;

  it("parses the date and rows", () => {
    const { date, entries } = parseTennisAbstractRankings(html);
    expect(date).toBe(20261019);
    expect(entries).toEqual([
      { rank: 1, name: "Jannik Sinner", country: "ITA", dob: 20010816 },
      { rank: 7, name: "Felix Auger Aliassime", country: "CAN", dob: 20000808 },
      { rank: 8, name: "O'Connell", country: "AUS", dob: null },
    ]);
  });

  it("refuses a page without a date", () => {
    expect(() => parseTennisAbstractRankings("<html></html>")).toThrow(/Last update/);
  });

  it("maps a published list to ids with points, and fails loudly on unknown top-100 players", () => {
    const match = playerMatcher(sackmann);
    const resolve = (e: { name: string; dob: number | null }) => match(e.name, e.dob);
    const list = publishedList(
      [{ rank: 7, name: "Felix Auger Aliassime", country: "CAN", dob: 20000808 }],
      resolve,
      new Map([[106421, 3100]]),
    );
    expect(list).toEqual([{ rank: 7, player: 106421, points: 3100 }]);
    expect(() => publishedList([{ rank: 3, name: "Mystery", country: "", dob: null }], resolve, new Map())).toThrow(
      /#3 Mystery/,
    );
    // Unknown players outside the top 100 are skipped.
    expect(publishedList([{ rank: 300, name: "Mystery", country: "", dob: null }], resolve, new Map())).toEqual([]);
  });
});
