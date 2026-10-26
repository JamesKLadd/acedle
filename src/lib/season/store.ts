import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { Rng } from "../roll";
import { createAdminClient } from "../supabase/admin";
import type { Database, Tables } from "../supabase/database.types";
import { drawSeason } from "./draw";
import { seasonState, seasonSummary, type SeasonSetup } from "./season";

type Db = SupabaseClient<Database>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StoredSeason {
  id: string;
  rollId: string;
  setup: SeasonSetup;
  sets: boolean[];
  status: Tables<"seasons">["status"];
  wins: number;
  losses: number;
  titles: number;
  points: number;
  calendarSlam: boolean;
  createdAt: string;
  finishedAt: string | null;
}

export const toStoredSeason = (row: Tables<"seasons">): StoredSeason => ({
  id: row.id,
  rollId: row.roll_id,
  setup: row.setup,
  sets: row.sets,
  status: row.status,
  wins: row.wins,
  losses: row.losses,
  titles: row.titles,
  points: row.points,
  calendarSlam: row.calendar_slam,
  createdAt: row.created_at,
  finishedAt: row.finished_at,
});

export type SeasonResult =
  | { ok: true; season: StoredSeason }
  | { ok: false; error: string; /** The season already in progress, when that's what's in the way. */ activeId?: string };

async function load(db: Db, id: string): Promise<StoredSeason | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db.from("seasons").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data && toStoredSeason(data);
}

/** Who owns a season: whoever owns its card. */
async function ownerOf(db: Db, rollId: string): Promise<string | null> {
  const { data, error } = await db.from("rolls").select("user_id").eq("id", rollId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

/**
 * A season by id, with the service role: anyone with a season's link can see
 * it, as with rolls. Null if there's no such season or it can't be read.
 */
export const getSeason = cache(async (id: string): Promise<StoredSeason | null> => {
  try {
    return await load(createAdminClient(), id);
  } catch (e) {
    console.error(`Couldn't load the season: ${e instanceof Error ? e.message : e}`);
    return null;
  }
});

/** Whether `userId` owns `season`. */
export async function ownsSeason(db: Db, userId: string, season: StoredSeason): Promise<boolean> {
  return (await ownerOf(db, season.rollId)) === userId;
}

/** The season `userId` has in progress, if any. */
export async function activeSeasonOf(db: Db, userId: string): Promise<StoredSeason | null> {
  const { data: rolls, error } = await db.from("rolls").select("id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!rolls.length) return null;
  const { data, error: e2 } = await db
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .in(
      "roll_id",
      rolls.map((r) => r.id),
    )
    .maybeSingle();
  if (e2) throw new Error(e2.message);
  return data && toStoredSeason(data);
}

/** Starts a season with `userId`'s card `rollId`, unless they already have one in progress. */
export async function createSeason(db: Db, userId: string, rollId: string, rng: Rng): Promise<SeasonResult> {
  if (!UUID.test(rollId)) return { ok: false, error: "That card doesn't exist." };
  const { data: roll, error } = await db
    .from("rolls")
    .select("id, user_id, season_snapshot, score")
    .eq("id", rollId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!roll || roll.user_id !== userId) {
    return { ok: false, error: "Only the player who rolled this card can take it into a season." };
  }

  const setup = drawSeason(roll.season_snapshot, roll.score, rng);
  const { data: id, error: e2 } = await db.rpc("season_start", { p_roll_id: rollId, p_setup: setup });
  if (e2) throw new Error(e2.message);
  if (!id) {
    const active = await activeSeasonOf(db, userId);
    return { ok: false, error: "You already have a season in progress.", activeId: active?.id };
  }
  return { ok: true, season: (await load(db, id))! };
}

/**
 * Records `userId`'s next set in season `id`. `expected` is how many sets the
 * browser has already recorded: if the stored season has moved on (another
 * tab), or is over, it's returned unchanged so the browser can catch up.
 */
export async function addSeasonSet(
  db: Db,
  userId: string,
  id: string,
  expected: number,
  won: boolean,
): Promise<SeasonResult> {
  const season = await load(db, id);
  if (!season || !(await ownsSeason(db, userId, season))) {
    return { ok: false, error: "Only the player whose season this is can play it." };
  }
  if (season.status !== "active" || season.sets.length !== expected) return { ok: true, season };
  if (!seasonState(season.setup, season.sets).current) return { ok: true, season };

  const sets = [...season.sets, won];
  const summary = seasonSummary(seasonState(season.setup, sets));
  // Whether it was added or another tab got there first, the stored season is the truth.
  const { error } = await db.rpc("season_add_set", {
    p_id: id,
    p_expected: expected,
    p_won: won,
    p_wins: summary.wins,
    p_losses: summary.losses,
    p_titles: summary.titles,
    p_points: summary.points,
    p_calendar_slam: summary.calendarSlam,
    p_finished: summary.finished,
  });
  if (error) throw new Error(error.message);
  return { ok: true, season: (await load(db, id))! };
}

/** Gives up `userId`'s season `id`: it stays in their history as unfinished, and frees them to start another. */
export async function abandonSeason(db: Db, userId: string, id: string): Promise<SeasonResult> {
  const season = await load(db, id);
  if (!season || !(await ownsSeason(db, userId, season))) {
    return { ok: false, error: "Only the player whose season this is can give it up." };
  }
  if (season.status === "active") {
    const now = new Date().toISOString();
    const { error } = await db
      .from("seasons")
      .update({ status: "abandoned", finished_at: now, updated_at: now })
      .eq("id", id)
      .eq("status", "active");
    if (error) throw new Error(error.message);
  }
  return { ok: true, season: (await load(db, id))! };
}

/** A card's seasons, newest first (none if they can't be read). */
export const seasonsOfRoll = cache(async (rollId: string): Promise<StoredSeason[]> => {
  if (!UUID.test(rollId)) return [];
  const { data, error } = await createAdminClient()
    .from("seasons")
    .select("*")
    .eq("roll_id", rollId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(`Couldn't load the card's seasons: ${error.message}`);
    return [];
  }
  return data.map(toStoredSeason);
});

/** The season `userId` has in progress, if any (null if it can't be read). */
export const getActiveSeason = cache(async (userId: string): Promise<StoredSeason | null> => {
  try {
    return await activeSeasonOf(createAdminClient(), userId);
  } catch (e) {
    console.error(`Couldn't load the season in progress: ${e instanceof Error ? e.message : e}`);
    return null;
  }
});
