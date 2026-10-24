"use server";

import { refresh } from "next/cache";

import { rollForToday, type DailyRoll } from "@/lib/roll/daily";
import { supabaseRollStore } from "@/lib/roll/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RollTodayResult =
  | { ok: true; roll: DailyRoll; created: boolean }
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
    return { ok: true, ...(await rollForToday(supabaseRollStore(createAdminClient()), userId)) };
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
