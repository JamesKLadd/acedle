"use server";

import { getChallenge, toRun, todaysChallenge, type StoredRun } from "@/lib/challenge-store";
import { addDays, utcDay } from "@/lib/roll/daily";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { tournamentState } from "@/lib/tournament";

export type RunSaved = { ok: true; run: StoredRun } | { ok: false; error: string };

async function signedInUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

async function loadRun(day: string, userId: string): Promise<StoredRun | null> {
  const { data, error } = await createAdminClient()
    .from("challenge_runs")
    .select("*")
    .eq("day", day)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data && toRun(data);
}

/**
 * Starts the signed-in player's run at today's challenge (guests too; the
 * browser signs in as one first), or returns the run already started: the
 * first run of the day is the one that counts.
 */
export async function startChallenge(day: string): Promise<RunSaved> {
  try {
    const userId = await signedInUser();
    if (!userId) return { ok: false, error: "You're not signed in. Reload the page and try again." };
    if (day !== utcDay()) return { ok: false, error: "That challenge is over. Reload for today's." };
    if (!(await todaysChallenge())) return { ok: false, error: "Today's challenge isn't ready. Please try again." };
    // A second tab may get there first; then keep its run.
    const { error } = await createAdminClient()
      .from("challenge_runs")
      .upsert({ day, user_id: userId }, { onConflict: "day,user_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true, run: (await loadRun(day, userId))! };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't start the challenge. Please try again." };
  }
}

/**
 * Records the player's next set. `expected` is how many sets the browser has
 * already recorded: if the stored run has moved on (another tab), it's
 * returned unchanged so the browser can catch up. A run started before
 * midnight (UTC) can be finished the next day.
 */
export async function playChallengeSet(day: string, expected: number, won: boolean): Promise<RunSaved> {
  try {
    const userId = await signedInUser();
    if (!userId) return { ok: false, error: "You're not signed in. Reload the page and try again." };
    const today = utcDay();
    if (day !== today && day !== addDays(today, -1)) return { ok: false, error: "That challenge is over." };
    const [challenge, run] = await Promise.all([getChallenge(day), loadRun(day, userId)]);
    if (!challenge || !run) return { ok: false, error: "This run hasn't started." };
    if (run.sets.length !== expected || !tournamentState(challenge.setup, run.sets).current) return { ok: true, run };

    const sets = [...run.sets, won];
    const { roundsWon } = tournamentState(challenge.setup, sets);
    const { data: status, error } = await createAdminClient().rpc("challenge_add_set", {
      p_day: day,
      p_user_id: userId,
      p_expected: expected,
      p_won: won,
      p_rounds_won: roundsWon,
    });
    if (error) throw new Error(error.message);
    if (status === "too-fast") return { ok: false, error: "That set came in too fast to count. Try again." };
    if (status === "added") {
      const finishedAt = roundsWon === null ? null : new Date().toISOString();
      return { ok: true, run: { sets, setsLost: run.setsLost + Number(!won), roundsWon, finishedAt } };
    }
    return { ok: true, run: (await loadRun(day, userId))! };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Couldn't save that set. Please try again." };
  }
}
