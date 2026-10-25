"use server";

import { refresh } from "next/cache";

import { loadSeasons } from "@/lib/data/seasons";
import { seasonPhoto } from "@/lib/photos";
import type { SeasonPhoto } from "@/lib/photos-types";
import { decoyNames } from "@/lib/roll";
import { rollForToday, type DailyRoll } from "@/lib/roll/daily";
import { supabaseRollStore } from "@/lib/roll/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { topPercent } from "@/lib/scoring/distribution";
import { createClient } from "@/lib/supabase/server";

export type RollTodayResult =
  | {
      ok: true;
      roll: DailyRoll;
      created: boolean;
      /** Other players from the season, for the reveal's name reel. */
      decoys: string[];
      topPercent: number;
      photo: SeasonPhoto | null;
    }
  | { ok: false; error: string };

/**
 * Rolls today's season for the signed-in user (guest or account). The server
 * picks and scores the roll; calling this again the same UTC day returns the
 * same roll (`created: false`). The browser signs in as a guest first if it
 * has no session, plays the reveal, then refreshes the page.
 */
export async function rollToday(): Promise<RollTodayResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { ok: false, error: "You're not signed in. Reload the page and try again." };

  try {
    const { roll, created } = await rollForToday(supabaseRollStore(createAdminClient()), userId);
    return {
      ok: true,
      roll,
      created,
      decoys: decoyNames(loadSeasons(), roll.season),
      topPercent: topPercent(roll.score.total),
      photo: seasonPhoto(roll.season.playerId, roll.season.year),
    };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't save your roll. Please try again." };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  refresh();
}
