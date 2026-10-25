"use server";

import { secureRandom } from "@/lib/roll/daily";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isTierId, tournamentState, type TierId } from "@/lib/tournament";
import { drawTournament } from "@/lib/tournament-draw";
import { toStoredTournament, type StoredTournament } from "@/lib/tournament-store";

export type TournamentResult = { ok: true; tournament: StoredTournament } | { ok: false; error: string };

/** The roll, if the signed-in user owns it. */
async function ownRoll(rollId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;
  const { data: roll } = await createAdminClient()
    .from("rolls")
    .select("id, user_id, season_snapshot, score")
    .eq("id", rollId)
    .maybeSingle();
  return roll?.user_id === userId ? roll : null;
}

async function load(rollId: string): Promise<StoredTournament | null> {
  const { data, error } = await createAdminClient().from("tournaments").select("*").eq("roll_id", rollId).maybeSingle();
  if (error) throw new Error(error.message);
  return data && toStoredTournament(data);
}

/**
 * Enters the roll's player into a new `tier` draw, or returns the one
 * already started (one tournament per roll, whatever its tier). Only the
 * roll's owner can.
 */
export async function startTournament(rollId: string, tier: TierId): Promise<TournamentResult> {
  try {
    if (!isTierId(tier)) return { ok: false, error: "Pick a tournament to enter." };
    const roll = await ownRoll(rollId);
    if (!roll) return { ok: false, error: "Only the player who rolled this can enter it." };
    const existing = await load(rollId);
    if (existing) return { ok: true, tournament: existing };

    const setup = drawTournament(roll.season_snapshot, roll.score, tier, secureRandom);
    // A second tab may get there first; then keep its draw.
    const { error } = await createAdminClient()
      .from("tournaments")
      .upsert({ roll_id: rollId, ...setup }, { onConflict: "roll_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true, tournament: (await load(rollId))! };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't start the tournament. Please try again." };
  }
}

/**
 * Records the player's next set. `expected` is how many sets the browser has
 * already recorded: if the stored tournament has moved on (another tab), it's
 * returned unchanged so the browser can catch up.
 */
export async function playSet(rollId: string, expected: number, won: boolean): Promise<TournamentResult> {
  try {
    if (!(await ownRoll(rollId))) return { ok: false, error: "Only the player who rolled this can play it." };
    const t = await load(rollId);
    if (!t) return { ok: false, error: "This tournament hasn't started." };
    if (t.sets.length !== expected || !tournamentState(t.setup, t.sets).current) return { ok: true, tournament: t };

    const sets = [...t.sets, won];
    const { roundsWon } = tournamentState(t.setup, sets);
    const { data: added, error } = await createAdminClient().rpc("tournament_add_set", {
      p_roll_id: rollId,
      p_expected: expected,
      p_won: won,
      p_rounds_won: roundsWon,
    });
    if (error) throw new Error(error.message);
    return { ok: true, tournament: added ? { ...t, sets, roundsWon } : (await load(rollId))! };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't save that set. Please try again." };
  }
}
