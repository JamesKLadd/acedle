import type { PlayerSeason } from "../data/types";

export type BadgeCategory = "titles" | "surface" | "ranking" | "matches" | "serve" | "profile" | "jackpot";

/** What a badge grants for one season. A badge grants points or a multiplier, never both. */
export type BadgeAward =
  | { points: number; count?: number; detail: string }
  | { multiplier: number; count?: number; detail: string };

export interface BadgeDef {
  id: string;
  name: string;
  category: BadgeCategory;
  /** How the badge is earned, shown in the badge collection. */
  description: string;
  /** Hidden badges show as "???" in the collection until earned. */
  hidden?: boolean;
  /** Returns null when the season doesn't earn the badge (or lacks the data to judge it). */
  evaluate(season: PlayerSeason): BadgeAward | null;
}

export interface EarnedBadge {
  id: string;
  name: string;
  category: BadgeCategory;
  /** Flat points added to the base (0 for multiplier badges). */
  points: number;
  /** Multiplier applied to the base (null for points badges). */
  multiplier: number | null;
  count?: number;
  detail: string;
}

export interface ScoreResult {
  version: number;
  badges: EarnedBadge[];
  /** Sum of all points badges. */
  base: number;
  /** Product of all multiplier badges, capped. */
  multiplier: number;
  total: number;
}
