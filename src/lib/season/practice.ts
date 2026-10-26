// Practice seasons from the sandbox: one at a time, kept in this browser's
// localStorage only (never on the server or the leaderboard).

import { useSyncExternalStore } from "react";

import type { CardSeason } from "@/components/card-photo";

import type { SeasonPhoto } from "../photos-types";
import { seasonState, type SeasonSetup } from "./season";

const KEY = "acedle:practice-season";

export interface PracticeSeason {
  id: string;
  setup: SeasonSetup;
  sets: boolean[];
  status: "active" | "finished" | "abandoned";
  /** The card, for its photo window. */
  card: CardSeason;
  photo: SeasonPhoto | null;
  createdAt: string;
}

const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(value: PracticeSeason | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode or full storage: the practice season just won't stick.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parse(raw: string | null): PracticeSeason | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PracticeSeason;
  } catch {
    return null;
  }
}

/** The stored practice season's JSON (stable between changes, so React can compare it). */
export const usePracticeRaw = () => useSyncExternalStore(subscribe, read, () => null);

export const loadPractice = () => parse(read());

/** Starts a practice season, replacing any other. */
export function startPractice(setup: SeasonSetup, card: CardSeason, photo: SeasonPhoto | null): PracticeSeason {
  const season: PracticeSeason = {
    id: crypto.randomUUID(),
    setup,
    sets: [],
    status: "active",
    card,
    photo,
    createdAt: new Date().toISOString(),
  };
  write(season);
  return season;
}

/** Appends the next set if the stored season is still at `expected` sets; returns what's stored. */
export function addPracticeSet(id: string, expected: number, won: boolean): PracticeSeason | null {
  const season = loadPractice();
  if (!season || season.id !== id) return null;
  if (season.status === "active" && season.sets.length === expected && seasonState(season.setup, season.sets).current) {
    season.sets = [...season.sets, won];
    if (seasonState(season.setup, season.sets).done) season.status = "finished";
    write(season);
  }
  return season;
}

export function clearPractice() {
  write(null);
}

export { parse as parsePractice };
