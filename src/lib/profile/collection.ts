// Profile views built from a user's rolls: summary stats, the badge
// collection and the player-dex. Pure, so they're easy to test.

import type { PlayerSeason } from "../data/types";
import type { BadgeCategory, BadgeDef } from "../scoring/types";
import type { RunResult } from "../tournament";

/** The parts of a stored roll the profile pages show. */
export interface RollSummary {
  id: string;
  /** UTC day, YYYY-MM-DD. */
  day: string;
  year: number;
  playerId: number;
  playerName: string;
  country: string;
  finalRank: number;
  score: number;
  /** The roll's finished tournament, if any. */
  tournament?: RunResult | null;
}

export function summarizeRolls(rolls: readonly RollSummary[]) {
  let best: RollSummary | null = null;
  let total = 0;
  for (const r of rolls) {
    total += r.score;
    if (!best || r.score > best.score) best = r;
  }
  return { count: rolls.length, total, best };
}

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  titles: "Titles",
  surface: "Surfaces",
  ranking: "Ranking",
  matches: "Matches",
  serve: "Serve",
  profile: "Profile",
  jackpot: "Jackpots",
};

export interface CollectedBadge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  hidden: boolean;
  /** Number of rolls that earned it (0 = not collected yet). */
  timesEarned: number;
  firstDay: string | null;
}

/**
 * Every badge, grouped by category in reveal order, with how often the user
 * has earned it. Earned ids that no longer exist (retired badges) are ignored.
 */
export function badgeCollection(
  defs: readonly BadgeDef[],
  earned: readonly { badge_id: string; times_earned: number; first_day: string }[],
) {
  const byId = new Map(earned.map((e) => [e.badge_id, e]));
  const groups = new Map<BadgeCategory, CollectedBadge[]>();
  let collected = 0;
  for (const def of defs) {
    const e = byId.get(def.id);
    if (e) collected++;
    const badges = groups.get(def.category) ?? [];
    badges.push({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      hidden: Boolean(def.hidden),
      timesEarned: e?.times_earned ?? 0,
      firstDay: e?.first_day ?? null,
    });
    groups.set(def.category, badges);
  }
  return {
    collected,
    total: defs.length,
    groups: [...groups].map(([category, badges]) => ({ category, label: CATEGORY_LABELS[category], badges })),
  };
}

export interface DexEntry {
  playerId: number;
  name: string;
  country: string;
  /** Seasons rolled, ascending. */
  years: number[];
  /** The roll to show for each season rolled (its first), by year. */
  rolls: Record<number, string>;
  /** The best-scoring of those rolls. */
  bestRoll: string;
  /** Best final rank across the rolled seasons. */
  bestRank: number;
}

/** Players the user has rolled, how many seasons, and rolls per year. */
export function playerDex(rolls: readonly RollSummary[]) {
  const players = new Map<number, DexEntry>();
  const bestScore = new Map<number, number>();
  const rollsPerYear = new Map<number, number>();
  // Oldest first, so each season shows its first roll.
  for (const r of [...rolls].sort((a, b) => a.day.localeCompare(b.day))) {
    rollsPerYear.set(r.year, (rollsPerYear.get(r.year) ?? 0) + 1);
    const p = players.get(r.playerId) ?? {
      playerId: r.playerId,
      name: r.playerName,
      country: r.country,
      years: [],
      rolls: {},
      bestRoll: r.id,
      bestRank: r.finalRank,
    };
    if (!p.years.includes(r.year)) {
      p.years.push(r.year);
      p.rolls[r.year] = r.id;
    }
    if (r.score > (bestScore.get(r.playerId) ?? -1)) {
      p.bestRoll = p.rolls[r.year];
      bestScore.set(r.playerId, r.score);
    }
    p.bestRank = Math.min(p.bestRank, r.finalRank);
    players.set(r.playerId, p);
  }
  const entries = [...players.values()]
    .map((p) => ({ ...p, years: p.years.sort((a, b) => a - b) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    players: entries,
    seasons: entries.reduce((n, p) => n + p.years.length, 0),
    rollsPerYear,
  };
}

/** How many players, player-seasons and years can be rolled at all. */
export function poolTotals(pools: ReadonlyMap<number, readonly PlayerSeason[]>) {
  const players = new Set<number>();
  let seasons = 0;
  for (const pool of pools.values()) {
    seasons += pool.length;
    for (const s of pool) players.add(s.playerId);
  }
  return { players: players.size, seasons, years: [...pools.keys()].sort((a, b) => a - b) };
}
