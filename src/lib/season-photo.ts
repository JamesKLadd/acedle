import "server-only";

import { cache } from "react";

import { pickSeasonPhoto, type ApprovedPhoto } from "./photo-choice";
import { seasonPhoto } from "./photos";
import { createAdminClient } from "./supabase/admin";
import type { SeasonPhoto } from "./photos-types";

/** A player's approved community photos, newest review first (none if they can't be read). */
export const approvedPhotos = cache(async (playerId: number): Promise<ApprovedPhoto[]> => {
  const { data, error } = await createAdminClient()
    .from("photo_submissions")
    .select("year, file, thumb, width, height, author, license, license_url, photo_year")
    .eq("player_id", playerId)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(50);
  // Cards show photos as an extra: don't fail them over it.
  if (error) {
    console.error(`Couldn't load suggested photos: ${error.message}`);
    return [];
  }
  return data.map((r) => ({
    year: r.year,
    photo: {
      file: r.file,
      year: r.photo_year,
      thumb: r.thumb,
      width: r.width,
      height: r.height,
      author: r.author,
      license: r.license,
      licenseUrl: r.license_url,
    },
  }));
});

/**
 * The photo for a player-season: from the Commons lookup (data/photos.json)
 * or an approved community suggestion, whichever fits the season best. Null
 * for the default card art.
 */
export async function getSeasonPhoto(playerId: number, year: number): Promise<SeasonPhoto | null> {
  return pickSeasonPhoto(year, seasonPhoto(playerId, year), await approvedPhotos(playerId));
}
