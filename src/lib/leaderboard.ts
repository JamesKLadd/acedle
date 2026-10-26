// Leaderboard reads. The Postgres functions return public columns only and
// mark the viewer's own entries (see supabase/migrations/*_leaderboards.sql).

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, FunctionReturns } from "./supabase/database.types";

export type RollBoardEntry = FunctionReturns<"roll_leaderboard">[number];
export type AllTimeEntry = FunctionReturns<"alltime_leaderboard">[number];
export type SeasonBoardEntry = FunctionReturns<"season_leaderboard">[number];
export type ChallengeBoardEntry = FunctionReturns<"challenge_leaderboard">[number];

/** How many entries a board lists before only the viewer's own rows follow. */
export const BOARD_SIZE = 100;

/** Rolls made between two UTC days (inclusive, at most a week). */
export async function getRollBoard(db: SupabaseClient<Database>, from: string, to: string): Promise<RollBoardEntry[]> {
  const { data, error } = await db.rpc("roll_leaderboard", { p_from: from, p_to: to });
  if (error) throw new Error(`Couldn't load the leaderboard: ${error.message}`);
  return data;
}

export async function getAllTimeBoard(db: SupabaseClient<Database>): Promise<AllTimeEntry[]> {
  const { data, error } = await db.rpc("alltime_leaderboard");
  if (error) throw new Error(`Couldn't load the leaderboard: ${error.message}`);
  return data;
}

/** Each account's best finished season. */
export async function getSeasonBoard(db: SupabaseClient<Database>): Promise<SeasonBoardEntry[]> {
  const { data, error } = await db.rpc("season_leaderboard");
  if (error) throw new Error(`Couldn't load the leaderboard: ${error.message}`);
  return data;
}

/** A day's challenge: finished runs, most rounds won, then fewest sets lost. */
export async function getChallengeBoard(db: SupabaseClient<Database>, day: string): Promise<ChallengeBoardEntry[]> {
  const { data, error } = await db.rpc("challenge_leaderboard", { p_day: day });
  if (error) throw new Error(`Couldn't load the leaderboard: ${error.message}`);
  return data;
}

/**
 * The board's top entries, and the viewer's entries that rank below them
 * (shown after a gap).
 */
export function splitBoard<T extends { is_viewer: boolean }>(entries: readonly T[]) {
  return { top: entries.slice(0, BOARD_SIZE), below: entries.slice(BOARD_SIZE) };
}

/** The first day Acedle had daily rolls; boards don't go further back. */
export const FIRST_DAY = "2026-10-24";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A ?day= value, clamped to [FIRST_DAY, today]; today when missing or malformed. */
export function boardDay(param: unknown, today: string): string {
  if (typeof param !== "string" || !ISO_DAY.test(param) || Number.isNaN(Date.parse(param))) return today;
  if (param > today) return today;
  if (param < FIRST_DAY) return FIRST_DAY;
  return param;
}
