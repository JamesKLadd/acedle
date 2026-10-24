import type { PlayerSeason } from "../data/types";
import { jackpotBadges } from "./badges/jackpot";
import { matchBadges } from "./badges/matches";
import { profileBadges } from "./badges/profile";
import { rankingBadges } from "./badges/ranking";
import { serveBadges } from "./badges/serve";
import { surfaceBadges } from "./badges/surface";
import { titleBadges } from "./badges/titles";
import type { BadgeDef, EarnedBadge, ScoreResult } from "./types";

export type * from "./types";

/**
 * Bump whenever badge rules or values change. Every stored roll records the
 * version that scored it, so old scores never change retroactively.
 */
export const SCORING_VERSION = 1;

/** Safety net only: the best real season reaches roughly ×190. */
export const MULTIPLIER_CAP = 1000;

/** All badges, in the order they are revealed. */
export const BADGES: readonly BadgeDef[] = [
  ...titleBadges,
  ...surfaceBadges,
  ...rankingBadges,
  ...matchBadges,
  ...serveBadges,
  ...profileBadges,
  ...jackpotBadges,
];

export function scoreSeason(season: PlayerSeason, badges: readonly BadgeDef[] = BADGES): ScoreResult {
  const earned: EarnedBadge[] = [];
  let base = 0;
  let multiplier = 1;

  for (const def of badges) {
    const award = def.evaluate(season);
    if (!award) continue;
    const common = { id: def.id, name: def.name, category: def.category, count: award.count, detail: award.detail };
    if ("multiplier" in award) {
      multiplier *= award.multiplier;
      earned.push({ ...common, points: 0, multiplier: award.multiplier });
    } else {
      base += award.points;
      earned.push({ ...common, points: award.points, multiplier: null });
    }
  }

  // Multiplier badges reveal last, after the base total is built up.
  earned.sort((a, b) => Number(a.multiplier !== null) - Number(b.multiplier !== null));
  multiplier = Math.min(multiplier, MULTIPLIER_CAP);
  return { version: SCORING_VERSION, badges: earned, base, multiplier, total: Math.round(base * multiplier) };
}
