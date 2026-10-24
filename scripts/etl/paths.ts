import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");

/** Archival mirror of Jeff Sackmann's datasets (the upstream repo was removed in 2026). */
export const DATA_REPO =
  process.env.ACEDLE_DATA_REPO ?? "https://github.com/Aneeshers/tennis-sackmann-archive";

export const CHECKOUT_DIR = join(ROOT, "data/raw/tennis-sackmann-archive");
export const RAW_DIR = process.env.ACEDLE_RAW_DIR ?? join(CHECKOUT_DIR, "atp");
export const SEASONS_DIR = join(ROOT, "data/seasons");
