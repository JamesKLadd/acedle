// Pure helpers for interpreting raw Sackmann rows.

import type { EntryType, EventCategory, SlamRound } from "../../src/lib/data/types";

/**
 * "team" events count toward match records but award no titles.
 * "excluded" events (exhibitions, non-ATP events) are ignored entirely.
 */
export type RawCategory = EventCategory | "team" | "excluded";

const EXCLUDED = /laver cup|next ?gen|grand slam cup/i;
const TEAM = /davis cup|atp cup|united cup|nations cup|world team cup|king'?s cup/i;

export function classifyEvent(level: string, name: string): RawCategory {
  if (EXCLUDED.test(name)) return "excluded";
  if (level === "D" || TEAM.test(name)) return "team";
  if (/olympics/i.test(name) || level === "O") return "olympics";
  switch (level) {
    case "G":
      return "slam";
    case "M":
      return "masters";
    case "F":
      return "finals";
    case "A":
      return "tour";
    default:
      // Challengers, futures, qualifying etc. are not in the files we read.
      return "excluded";
  }
}

const ROUND_ORDER: Record<string, number> = {
  ER: 0,
  RR: 0,
  R128: 1,
  R64: 2,
  R32: 3,
  R16: 4,
  QF: 5,
  SF: 6,
  BR: 6.5,
  F: 7,
};

export function roundOrder(round: string): number {
  return ROUND_ORDER[round] ?? 0;
}

const SLAM_ROUNDS: readonly SlamRound[] = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "W"];

/** Rank slam results so the furthest one wins. */
export function slamRoundOrder(round: SlamRound): number {
  return SLAM_ROUNDS.indexOf(round);
}

export function asSlamRound(round: string): SlamRound | null {
  return (SLAM_ROUNDS as readonly string[]).includes(round) ? (round as SlamRound) : null;
}

export function normalizeEntry(raw: string): EntryType {
  switch (raw.trim().toUpperCase()) {
    case "Q":
      return "Q";
    case "WC":
      return "WC";
    case "LL":
      return "LL";
    case "PR":
      return "PR";
    case "SE":
      return "SE";
    case "ALT":
      return "ALT";
    default:
      return null;
  }
}

export interface ParsedScore {
  /** Games per set from the match winner's perspective: [winner, loser]. */
  sets: Array<[number, number]>;
  /** Parallel to `sets`: whether that set was decided by a tiebreak. */
  tiebreak: boolean[];
  walkover: boolean;
  /** Retirement, default, or abandoned: the match did not finish normally. */
  incomplete: boolean;
}

const SET_RE = /^(\d+)-(\d+)(\(\d+\))?\??$/;
const MATCH_TB_RE = /^\[(\d+)-(\d+)\]$/;

export function parseScore(score: string): ParsedScore {
  const result: ParsedScore = { sets: [], tiebreak: [], walkover: false, incomplete: false };
  for (const token of score.trim().split(/\s+/)) {
    if (!token) continue;
    const set = SET_RE.exec(token);
    if (set) {
      const w = Number(set[1]);
      const l = Number(set[2]);
      const hi = Math.max(w, l);
      const lo = Math.min(w, l);
      result.sets.push([w, l]);
      result.tiebreak.push(Boolean(set[3]) || (hi === 7 && lo === 6) || (hi === 13 && lo === 12));
      continue;
    }
    const tb = MATCH_TB_RE.exec(token);
    if (tb) {
      // Match tiebreak played in place of a deciding set.
      result.sets.push([Number(tb[1]), Number(tb[2])]);
      result.tiebreak.push(true);
      continue;
    }
    if (/^(w\/o|walkover)$/i.test(token)) result.walkover = true;
    else if (/^(ret|def\.?|default|abandoned|abd|unfinished)$/i.test(token)) result.incomplete = true;
  }
  if (result.walkover) {
    result.sets = [];
    result.tiebreak = [];
  }
  return result;
}

/** A set counts as won only if it was completed in the winner's favour. */
export function setWinner(set: [number, number]): "w" | "l" | null {
  const [w, l] = set;
  if (w > l && w >= 6) return "w";
  if (l > w && l >= 6) return "l";
  return null;
}

/** YYYYMMDD → whole years of age at another YYYYMMDD date. */
export function ageAt(dob: number, at: number): number {
  const years = Math.floor(at / 10000) - Math.floor(dob / 10000);
  return at % 10000 < dob % 10000 ? years - 1 : years;
}

/** YYYYMMDD → days since epoch (UTC). */
export function dayNumber(yyyymmdd: number): number {
  const y = Math.floor(yyyymmdd / 10000);
  const m = Math.floor((yyyymmdd % 10000) / 100);
  const d = yyyymmdd % 100;
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/**
 * Ranking ids the archive later gave to someone else. Its rankings list
 * Martin Damm Sr. (born 1972) under 102093 until 2003, but atp_players.csv
 * now uses 102093 for his son, Martin Damm Jr. (born 2003), and the matches
 * use 210013 for the father.
 */
export const REASSIGNED_RANKING_IDS: ReadonlyMap<number, number> = new Map([[102093, 210013]]);

/**
 * The player a ranking entry is for. An entry dated before its player was
 * born is for whoever held the id back then (see REASSIGNED_RANKING_IDS),
 * or null when we don't know who that was.
 */
export function rankedPlayer(
  id: number,
  date: number,
  dob: number | null,
  reassigned: ReadonlyMap<number, number> = REASSIGNED_RANKING_IDS,
): number | null {
  if (dob === null || date >= dob) return id;
  return reassigned.get(id) ?? null;
}
