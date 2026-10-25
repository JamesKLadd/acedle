// Choosing between the looked-up photo and approved community suggestions.
// Pure, so it's testable.

import type { Photo, SeasonPhoto } from "./photos-types";

export interface ApprovedPhoto {
  /** The season it was suggested for; null = all the player's seasons. */
  year: number | null;
  photo: Photo;
}

/** Years between the photo and the season (undated photos count as 4). */
const gap = (p: Photo, year: number) => (p.year === null ? 4 : Math.abs(p.year - year));

/**
 * In order: a suggestion approved for this season; the looked-up photo if
 * it's from this season; then whichever photo was taken closest to it,
 * suggestions winning ties. `approved` is newest first.
 */
export function pickSeasonPhoto(year: number, lookedUp: SeasonPhoto | null, approved: ApprovedPhoto[]): SeasonPhoto | null {
  const withSeason = (p: Photo): SeasonPhoto => ({ ...p, sameSeason: p.year === year });
  const exact = approved.find((a) => a.year === year);
  if (exact) return withSeason(exact.photo);
  if (lookedUp?.sameSeason) return lookedUp;
  let best: Photo | null = null;
  for (const { photo } of approved) if (!best || gap(photo, year) < gap(best, year)) best = photo;
  if (lookedUp && (!best || gap(lookedUp, year) < gap(best, year))) return lookedUp;
  return best && withSeason(best);
}
