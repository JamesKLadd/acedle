import "server-only";

import { cache } from "react";

import { getViewer } from "../auth/viewer";
import type { RollSummary } from "./collection";

/** The viewer's rolls, newest first (RLS limits the query to their own). */
export const getMyRolls = cache(async (): Promise<RollSummary[]> => {
  const { supabase, userId } = await getViewer();
  if (!userId) return [];
  const [{ data, error }, tournaments] = await Promise.all([
    supabase
      .from("rolls")
      .select(
        "id, day, year, player_id, score, player_name:season_snapshot->>name, country:season_snapshot->>country, final_rank:season_snapshot->ranking->>final",
      )
      .eq("user_id", userId)
      .order("day", { ascending: false }),
    // Finished tournaments, by roll. A nice-to-have: an error just leaves them out.
    supabase
      .from("tournaments")
      .select("roll_id, rounds_won, tier")
      .not("rounds_won", "is", null)
      .then(({ data, error }) => {
        if (error) console.error(`Couldn't load tournaments: ${error.message}`);
        return new Map((data ?? []).map((t) => [t.roll_id, { tier: t.tier, roundsWon: t.rounds_won! }]));
      }),
  ]);
  if (error) throw new Error(`Couldn't load your rolls: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    day: r.day,
    year: r.year,
    playerId: r.player_id,
    playerName: r.player_name,
    country: r.country,
    finalRank: Number(r.final_rank),
    score: r.score,
    tournament: tournaments.get(r.id) ?? null,
  }));
});

/** The viewer's profile, or null for guests and visitors without a session. */
export const getMyProfile = cache(async () => {
  const { supabase, userId, isAccount } = await getViewer();
  if (!userId || !isAccount) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("handle, avatar_url, created_at, total_score, roll_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load your profile: ${error.message}`);
  return data;
});

/** Badges the viewer has earned, with counts. */
export async function getMyBadges() {
  const { supabase, userId } = await getViewer();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id, times_earned, first_day")
    .eq("user_id", userId);
  if (error) throw new Error(`Couldn't load your badges: ${error.message}`);
  return data;
}
