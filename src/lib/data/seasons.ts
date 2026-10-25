import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PlayerSeason } from "./types";
import { ROLLABLE_YEARS } from "./years";

export interface SeasonsMeta {
  firstYear: number;
  lastYear: number;
  liveYear: number | null;
  /** Date of the latest ranking list, YYYYMMDD. */
  dataAsOf: number;
  /** Day of the latest live-season result, YYYYMMDD (when live data was used). */
  resultsThrough?: number;
  /** True when the latest ranking list is estimated from tournament entry ranks. */
  rankingsEstimated?: boolean;
}

const SEASONS_DIR = join(process.cwd(), "data/seasons");

let cache: Map<number, PlayerSeason[]> | null = null;

/** All player-seasons, keyed by year and sorted by final rank. */
export function loadSeasons(): Map<number, PlayerSeason[]> {
  if (!cache) {
    cache = new Map(
      ROLLABLE_YEARS.map((y) => [
        y,
        JSON.parse(readFileSync(join(SEASONS_DIR, `${y}.json`), "utf8")) as PlayerSeason[],
      ]),
    );
  }
  return cache;
}

export function loadMeta(): SeasonsMeta {
  return JSON.parse(readFileSync(join(SEASONS_DIR, "meta.json"), "utf8"));
}

export function findSeason(year: number, playerId: number): PlayerSeason | undefined {
  return loadSeasons()
    .get(year)
    ?.find((s) => s.playerId === playerId);
}

let latest: Map<number, PlayerSeason> | null = null;

/** A player's latest rollable season (for their name and details), by player id. */
export function findPlayer(playerId: number): PlayerSeason | undefined {
  if (!latest) {
    latest = new Map();
    for (const seasons of loadSeasons().values()) for (const s of seasons) latest.set(s.playerId, s);
  }
  return latest.get(playerId);
}
