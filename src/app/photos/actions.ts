"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin";
import { commonsFileName, lookupCommonsFile } from "@/lib/commons";
import { findSeason } from "@/lib/data/seasons";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Suggestions one account can have waiting for review at once. */
const MAX_PENDING = 10;

export type SuggestState = { ok: boolean; message: string } | null;

async function currentUser() {
  const { data } = await (await createClient()).auth.getClaims();
  return data?.claims ?? null;
}

/**
 * Suggests a Commons photo for a player-season (or all the player's seasons).
 * Signed-in accounts only; the file is checked on Commons and waits for review.
 */
export async function suggestPhoto(_prev: SuggestState, form: FormData): Promise<SuggestState> {
  const claims = await currentUser();
  if (!claims || claims.is_anonymous) return { ok: false, message: "Sign in to suggest photos." };

  const playerId = Number(form.get("player"));
  const year = Number(form.get("year"));
  const season = findSeason(year, playerId);
  if (!season) return { ok: false, message: "That season isn't in Acedle." };
  const file = commonsFileName(String(form.get("file") ?? ""));
  if (!file) {
    return { ok: false, message: "Paste the link to a photo's page on Wikimedia Commons (a JPEG or PNG file)." };
  }
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  const allSeasons = form.get("scope") === "all";

  try {
    const db = createAdminClient();
    const { count, error: countError } = await db
      .from("photo_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by", claims.sub)
      .eq("status", "pending");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= MAX_PENDING) {
      return { ok: false, message: `You have ${MAX_PENDING} suggestions waiting for review. Try again once they're checked.` };
    }

    const found = await lookupCommonsFile(file);
    if (!found.ok) return { ok: false, message: found.error };
    const { photo } = found;
    const { error } = await db.from("photo_submissions").insert({
      player_id: playerId,
      year: allSeasons ? null : year,
      file: photo.file,
      thumb: photo.thumb,
      width: photo.width,
      height: photo.height,
      author: photo.author,
      license: photo.license,
      license_url: photo.licenseUrl,
      photo_year: photo.year,
      note,
      submitted_by: claims.sub,
    });
    if (error?.code === "23505") {
      return { ok: false, message: "That photo has already been suggested for this player." };
    }
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Couldn't save your suggestion. Please try again." };
  }
  revalidatePath(`/photos/suggest/${playerId}/${year}`);
  return { ok: true, message: "Thanks! Your photo will show up on the card once it's been checked." };
}

/** Approves or rejects a suggestion (admins only); approving again or rejecting later undoes a review. */
export async function reviewPhoto(form: FormData): Promise<void> {
  const claims = await currentUser();
  if (!claims || claims.is_anonymous || !(await isAdmin(claims.sub))) throw new Error("Not allowed");
  const decision = form.get("decision");
  if (decision !== "approved" && decision !== "rejected") throw new Error("Unknown decision");
  const { error } = await createAdminClient()
    .from("photo_submissions")
    .update({ status: decision, reviewed_at: new Date().toISOString(), reviewed_by: claims.sub })
    .eq("id", String(form.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/photos");
}
