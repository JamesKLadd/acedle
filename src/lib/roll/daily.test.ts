import { describe, expect, it } from "vitest";

import { findSeason, loadSeasons } from "../data/seasons";
import { SCORING_VERSION, scoreSeason } from "../scoring";
import {
  addDays,
  rollForToday,
  rollRow,
  secureRandom,
  toDailyRoll,
  utcDay,
  weekOf,
  type RollInsert,
  type RollRow,
  type RollStore,
} from "./daily";

/** In-memory RollStore with the same one-roll-per-day rule as the rolls table. */
function memoryStore() {
  const rows = new Map<string, RollRow>();
  const key = (userId: string, day: string) => `${userId}:${day}`;
  const store: RollStore = {
    async find(userId, day) {
      return rows.get(key(userId, day)) ?? null;
    },
    async insert(row: RollInsert) {
      if (rows.has(key(row.user_id, row.day))) return null;
      const stored: RollRow = {
        ...row,
        id: crypto.randomUUID(),
        week: weekOf(row.day),
        created_at: new Date().toISOString(),
      };
      rows.set(key(row.user_id, row.day), stored);
      return stored;
    },
  };
  return { store, rows };
}

const pools = loadSeasons();
const djokovic2015 = findSeason(2015, 104925)!;

describe("utcDay", () => {
  it("uses the UTC calendar day", () => {
    expect(utcDay(new Date("2026-10-24T23:59:59.999Z"))).toBe("2026-10-24");
    expect(utcDay(new Date("2026-10-25T00:00:00.000Z"))).toBe("2026-10-25");
    expect(utcDay(new Date("2026-10-24T22:30:00-05:00"))).toBe("2026-10-25");
  });
});

describe("addDays", () => {
  it("moves across months, years and leap days", () => {
    expect(addDays("2026-10-24", 6)).toBe("2026-10-30");
    expect(addDays("2026-12-28", 6)).toBe("2027-01-03");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-10-24", 0)).toBe("2026-10-24");
  });
});

describe("weekOf", () => {
  it("returns the Monday that starts the week", () => {
    expect(weekOf("2026-10-19")).toBe("2026-10-19"); // Monday
    expect(weekOf("2026-10-24")).toBe("2026-10-19"); // Saturday
    expect(weekOf("2026-10-25")).toBe("2026-10-19"); // Sunday
    expect(weekOf("2026-10-26")).toBe("2026-10-26"); // next Monday
    expect(weekOf("2027-01-01")).toBe("2026-12-28"); // across a year boundary
  });
});

describe("secureRandom", () => {
  it("stays in [0, 1)", () => {
    for (let i = 0; i < 10_000; i++) {
      const r = secureRandom();
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});

describe("rollRow", () => {
  it("stores the season and its score", () => {
    const row = rollRow("user-1", "2026-10-24", djokovic2015);
    const score = scoreSeason(djokovic2015);
    expect(row).toMatchObject({
      user_id: "user-1",
      day: "2026-10-24",
      year: 2015,
      player_id: 104925,
      season_snapshot: djokovic2015,
      badges: score.badges,
      base: score.base,
      mult: score.multiplier,
      score: score.total,
      scoring_version: SCORING_VERSION,
    });
  });

  it("round-trips through toDailyRoll", () => {
    const row: RollRow = { ...rollRow("u", "2026-10-24", djokovic2015), id: "r1", week: "2026-10-19", created_at: "t" };
    expect(toDailyRoll(row)).toEqual({
      id: "r1",
      day: "2026-10-24",
      season: djokovic2015,
      score: scoreSeason(djokovic2015),
      createdAt: "t",
    });
  });
});

describe("rollForToday", () => {
  const now = new Date("2026-10-24T12:00:00Z");

  it("rolls once per user per UTC day", async () => {
    const { store, rows } = memoryStore();
    const first = await rollForToday(store, "user-1", { now, pools });
    expect(first.created).toBe(true);
    expect(first.roll.day).toBe("2026-10-24");
    expect(pools.get(first.roll.season.year)).toContain(first.roll.season);
    expect(first.roll.score).toEqual(scoreSeason(first.roll.season));

    const again = await rollForToday(store, "user-1", { now: new Date("2026-10-24T23:59:59Z"), pools });
    expect(again).toEqual({ roll: first.roll, created: false });
    expect(rows.size).toBe(1);
  });

  it("gives a new roll after UTC midnight and to other users", async () => {
    const { store, rows } = memoryStore();
    await rollForToday(store, "user-1", { now, pools });
    const tomorrow = await rollForToday(store, "user-1", { now: new Date("2026-10-25T00:00:00Z"), pools });
    const other = await rollForToday(store, "user-2", { now, pools });
    expect(tomorrow.created).toBe(true);
    expect(tomorrow.roll.day).toBe("2026-10-25");
    expect(other.created).toBe(true);
    expect(rows.size).toBe(3);
  });

  it("returns the stored roll when a concurrent request wins the race", async () => {
    const { store } = memoryStore();
    // Another request stores its roll between our lookup and our insert.
    const racing: RollStore = {
      find: store.find,
      async insert(row) {
        await store.insert({ ...row, player_id: djokovic2015.playerId, year: 2015, season_snapshot: djokovic2015 });
        return store.insert(row);
      },
    };
    const result = await rollForToday(racing, "user-1", { now, pools });
    expect(result.created).toBe(false);
    expect(result.roll.season).toBe(djokovic2015);
  });

  it("uses the injected random source", async () => {
    // rng() = 0 picks the first year and its first-ranked player.
    const { store } = memoryStore();
    const { roll } = await rollForToday(store, "user-1", { now, pools, rng: () => 0 });
    expect(roll.season.year).toBe(1990);
    expect(roll.season.ranking.final).toBe(1);
  });
});
