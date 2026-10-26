"use server";

import { secureRandom } from "@/lib/roll/daily";
import { abandonSeason as abandon, addSeasonSet, createSeason, type SeasonResult } from "@/lib/season/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user (guests included), or null. */
async function currentUserId(): Promise<string | null> {
  const { data } = await (await createClient()).auth.getClaims();
  return data?.claims.sub ?? null;
}

/** Wraps a season action: signed-in only, and failures come back as a message. */
async function run(what: string, act: (userId: string) => Promise<SeasonResult>): Promise<SeasonResult> {
  try {
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: "You're not signed in. Reload the page and try again." };
    return await act(userId);
  } catch (e) {
    console.error(e);
    return { ok: false, error: `Couldn't ${what}. Please try again.` };
  }
}

/** Takes one of the player's cards into a new season (one in progress at a time). */
export async function startSeason(rollId: string): Promise<SeasonResult> {
  return run("start the season", (userId) => createSeason(createAdminClient(), userId, rollId, secureRandom));
}

/** Records the player's next set; `expected` is how many sets the browser already has. */
export async function playSeasonSet(seasonId: string, expected: number, won: boolean): Promise<SeasonResult> {
  return run("save that set", (userId) => addSeasonSet(createAdminClient(), userId, seasonId, expected, won));
}

/** Gives up the player's season in progress (kept as unfinished). */
export async function abandonSeason(seasonId: string): Promise<SeasonResult> {
  return run("give up the season", (userId) => abandon(createAdminClient(), userId, seasonId));
}
