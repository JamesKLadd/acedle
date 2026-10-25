import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PhotosFile, SeasonPhoto } from "./photos-types";

const PHOTOS_FILE = join(process.cwd(), "data/photos.json");

let cache: PhotosFile | null = null;

function photos(): PhotosFile {
  // A missing file isn't cached, so photos appear once it's built.
  if (!cache && existsSync(PHOTOS_FILE)) cache = JSON.parse(readFileSync(PHOTOS_FILE, "utf8")) as PhotosFile;
  return cache ?? { fetched: "", players: {} };
}

/** The photo for a player-season (see scripts/etl/photos.ts), or null for the default card art. */
export function seasonPhoto(playerId: number, year: number): SeasonPhoto | null {
  const p = photos().players[playerId];
  const i = p?.seasons[year];
  if (!p || i === undefined) return null;
  const photo = p.photos[i];
  return { ...photo, sameSeason: photo.year === year };
}
