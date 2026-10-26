import "server-only";

import { cache } from "react";

import { challengeNumber, challengeTier } from "./challenge";
import { loadSeasons } from "./data/seasons";
import type { PlayerSeason } from "./data/types";
import { rollSeason } from "./roll";
import { secureRandom, utcDay } from "./roll/daily";
import { scoreSeason } from "./scoring";
import { createAdminClient } from "./supabase/admin";
import type { Tables } from "./supabase/database.types";
import type { TierId, TournamentSetup } from "./tournament";
import { drawTournament } from "./tournament-draw";

export interface StoredChallenge {
  /** UTC day, YYYY-MM-DD. */
  day: string;
  number: number;
  tier: TierId;
  /** The card as it was that day. */
  card: PlayerSeason;
  score: number;
  setup: TournamentSetup;
}

export interface StoredRun {
  sets: boolean[];
  setsLost: number;
  /** Null while the run goes on. */
  roundsWon: number | null;
  finishedAt: string | null;
}

const toChallenge = (row: Tables<"challenges">): StoredChallenge => ({
  day: row.day,
  number: challengeNumber(row.day),
  tier: row.tier,
  card: row.card,
  score: Number(row.score),
  setup: { tier: row.tier, entrants: row.entrants, you: row.you, seed: Number(row.seed) },
});

export const toRun = (row: Tables<"challenge_runs">): StoredRun => ({
  sets: row.sets,
  setsLost: row.sets_lost,
  roundsWon: row.rounds_won,
  finishedAt: row.finished_at,
});

/** A day's challenge, if it was made. */
export const getChallenge = cache(async (day: string): Promise<StoredChallenge | null> => {
  const { data, error } = await createAdminClient().from("challenges").select("*").eq("day", day).maybeSingle();
  if (error) throw new Error(`Couldn't load the challenge: ${error.message}`);
  return data && toChallenge(data);
});

/**
 * Today's challenge, made the first time anyone asks: a card rolled like the
 * daily roll and a draw at today's tier, both from the CSPRNG so nobody can
 * see it coming. If two requests race, the first one stored wins. Null if
 * the challenge can't be loaded (e.g. before its migration is applied), so
 * pages can leave it out.
 */
export const todaysChallenge = cache(async (): Promise<StoredChallenge | null> => {
  const day = utcDay();
  try {
    const existing = await getChallenge(day);
    if (existing) return existing;
    const card = rollSeason(loadSeasons(), { rng: secureRandom });
    const score = scoreSeason(card).total;
    const tier = challengeTier(day);
    const setup = drawTournament(card, score, tier, secureRandom);
    const { error } = await createAdminClient()
      .from("challenges")
      .upsert(
        { day, tier, card, score, entrants: setup.entrants, you: setup.you, seed: setup.seed },
        { onConflict: "day", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    const { data, error: readError } = await createAdminClient().from("challenges").select("*").eq("day", day).single();
    if (readError) throw new Error(readError.message);
    return toChallenge(data);
  } catch (e) {
    console.error(`Couldn't load today's challenge: ${e instanceof Error ? e.message : e}`);
    return null;
  }
});

/** A player's run at a day's challenge, if they started one. */
export const getRun = cache(async (day: string, userId: string): Promise<StoredRun | null> => {
  const { data, error } = await createAdminClient()
    .from("challenge_runs")
    .select("*")
    .eq("day", day)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load your run: ${error.message}`);
  return data && toRun(data);
});

/** A player's past runs, newest first, with each day's card and tier. */
export async function runsOf(userId: string, limit = 60) {
  const db = createAdminClient();
  const { data: runs, error } = await db
    .from("challenge_runs")
    .select("*")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Couldn't load your challenges: ${error.message}`);
  if (runs.length === 0) return [];
  const { data: days, error: dayError } = await db
    .from("challenges")
    .select("day, tier, entrants, you, card->>name, card->>year")
    .in(
      "day",
      runs.map((r) => r.day),
    );
  if (dayError) throw new Error(`Couldn't load your challenges: ${dayError.message}`);
  const byDay = new Map(days.map((d) => [d.day, d]));
  return runs.flatMap((r) => {
    const c = byDay.get(r.day);
    if (!c) return [];
    return [
      {
        day: r.day,
        number: challengeNumber(r.day),
        tier: c.tier,
        size: c.entrants.length,
        seed: c.entrants[c.you].seed,
        card: { name: c.name as string, year: Number(c.year) },
        run: toRun(r),
      },
    ];
  });
}
