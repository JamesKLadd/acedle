import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");

/** Archival mirror of Jeff Sackmann's datasets (the upstream repo was removed in 2026). */
export const DATA_REPO =
  process.env.ACEDLE_DATA_REPO ?? "https://github.com/Aneeshers/tennis-sackmann-archive";

export const CHECKOUT_DIR = join(ROOT, "data/raw/tennis-sackmann-archive");
export const RAW_DIR = process.env.ACEDLE_RAW_DIR ?? join(CHECKOUT_DIR, "atp");
export const SEASONS_DIR = join(ROOT, "data/seasons");

// Live season (see live.ts). Override the sources with these variables if they move.
export const TML_BASE = process.env.ACEDLE_TML_BASE ?? "https://stats.tennismylife.org/data";
export const RANKINGS_URL = process.env.ACEDLE_RANKINGS_URL ?? "https://www.tennisabstract.com/reports/atpRankings.html";
export const LIVE_RAW_DIR = join(ROOT, "data/raw/live");
/** Every published ranking list fetched so far. Committed, so the weekly history builds up. */
export const LIVE_RANKINGS_FILE = join(ROOT, "data/live/atp_rankings_live.csv");
