// The daily roll: one uniform roll per user per UTC day, scored on the server
// and stored with everything it was scored from. This module is storage-agnostic
// (see RollStore) so the one-per-day rules can be tested without a database.

import { loadSeasons } from "../data/seasons";
import type { PlayerSeason } from "../data/types";
import { scoreSeason, type ScoreResult } from "../scoring";
import type { Tables, TablesInsert } from "../supabase/database.types";
import { rollSeason, type Rng } from "./index";

export type RollRow = Tables<"rolls">;
export type RollInsert = TablesInsert<"rolls">;

/** A stored roll, as the app shows it. */
export interface DailyRoll {
  id: string;
  /** UTC day, YYYY-MM-DD. */
  day: string;
  /** Stats as they were when rolled (live 2026 seasons keep changing). */
  season: PlayerSeason;
  score: ScoreResult;
  createdAt: string;
}

/** UTC calendar day, YYYY-MM-DD. The daily roll resets at UTC midnight. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Monday of the day's week (weeks run Monday to Sunday, UTC). Matches rolls.week. */
export function weekOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return utcDay(d);
}

/** Uniform [0, 1) from the platform CSPRNG, so rolls can't be predicted. */
export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function rollRow(userId: string, day: string, season: PlayerSeason): RollInsert {
  const score = scoreSeason(season);
  return {
    user_id: userId,
    day,
    year: season.year,
    player_id: season.playerId,
    season_snapshot: season,
    badges: score.badges,
    base: score.base,
    mult: score.multiplier,
    score: score.total,
    scoring_version: score.version,
  };
}

export function toDailyRoll(row: RollRow): DailyRoll {
  return {
    id: row.id,
    day: row.day,
    season: row.season_snapshot,
    score: {
      version: row.scoring_version,
      badges: row.badges,
      base: row.base,
      multiplier: row.mult,
      total: row.score,
    },
    createdAt: row.created_at,
  };
}

/** Storage for rolls. Backed by Supabase in store.ts and by memory in tests. */
export interface RollStore {
  find(userId: string, day: string): Promise<RollRow | null>;
  /** Stores the roll, or returns null if the user already has a roll that day. */
  insert(row: RollInsert): Promise<RollRow | null>;
}

/**
 * Today's roll for a user. If they already rolled today, that roll comes back
 * unchanged. Otherwise a fresh uniform roll is scored and stored. The store's
 * one-roll-per-day rule settles races (two tabs rolling at once): the slower
 * request gets the roll that was stored first.
 */
export async function rollForToday(
  store: RollStore,
  userId: string,
  {
    now = new Date(),
    rng = secureRandom,
    pools = loadSeasons(),
  }: { now?: Date; rng?: Rng; pools?: ReadonlyMap<number, readonly PlayerSeason[]> } = {},
): Promise<{ roll: DailyRoll; created: boolean }> {
  const day = utcDay(now);
  const existing = await store.find(userId, day);
  if (existing) return { roll: toDailyRoll(existing), created: false };

  const inserted = await store.insert(rollRow(userId, day, rollSeason(pools, { rng })));
  if (inserted) return { roll: toDailyRoll(inserted), created: true };

  const first = await store.find(userId, day);
  if (!first) throw new Error(`Roll for ${day} conflicted, but no stored roll was found`);
  return { roll: toDailyRoll(first), created: false };
}
