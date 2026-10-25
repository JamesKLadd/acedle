import "server-only";

import { cache } from "react";

import { createAdminClient } from "./supabase/admin";
import type { Tables } from "./supabase/database.types";
import type { TournamentSetup } from "./tournament";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StoredTournament {
  setup: TournamentSetup;
  sets: boolean[];
  /** Null while the run goes on. */
  roundsWon: number | null;
}

export const toStoredTournament = (row: Tables<"tournaments">): StoredTournament => ({
  setup: { entrants: row.entrants, you: row.you, seed: Number(row.seed) },
  sets: row.sets,
  roundsWon: row.rounds_won,
});

/**
 * A roll's tournament, if one was started. Like getSharedRoll, reads with the
 * service role (anyone with a roll's link can see how its tournament went).
 */
export const getTournament = cache(async (rollId: string): Promise<StoredTournament | null> => {
  if (!UUID.test(rollId)) return null;
  const { data, error } = await createAdminClient().from("tournaments").select("*").eq("roll_id", rollId).maybeSingle();
  // Pages show tournaments as an extra: don't fail them over it.
  if (error) {
    console.error(`Couldn't load the tournament: ${error.message}`);
    return null;
  }
  return data && toStoredTournament(data);
});
