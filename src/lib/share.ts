// Wordle-style share text for a roll.

import type { PlayerSeason } from "./data/types";
import { fmtDate, fmtMult, fmtScore, fmtTopPercent } from "./format";
import { revealTimeline } from "./reveal";
import type { BadgeCategory, ScoreResult } from "./scoring/types";

export const CATEGORY_EMOJI: Record<BadgeCategory, string> = {
  titles: "🏆",
  surface: "🟫",
  ranking: "📈",
  matches: "🎾",
  serve: "🚀",
  profile: "🧬",
  jackpot: "💎",
};

/**
 * Acedle Oct 24, 2026
 * 2015 Novak Djokovic (#1)
 * 🏆🏆🏆🏆🟫🟫🟫🟫🟫📈📈📈🎾🎾🎾🎾🎾🎾🎾🎾🎾🎾🚀🚀🚀🏆🏆🏆💎📈💎💎 ×191.41
 * 103,061,889 pts · top 0.03%
 *
 * The share button adds the roll's link as a last line.
 */
export function shareText({
  day,
  season: s,
  score,
  topPercent,
}: {
  day: string;
  season: PlayerSeason;
  score: ScoreResult;
  topPercent: number;
}): string {
  // Same order as the reveal: points badges, then multipliers.
  const emoji = revealTimeline(score)
    .badges.map((b) => CATEGORY_EMOJI[b.category])
    .join("");
  const multiplier = score.multiplier > 1 ? ` ${fmtMult(score.multiplier)}` : "";
  return [
    `Acedle ${fmtDate(day)}`,
    `${s.year} ${s.name} (#${s.ranking.final})`,
    `${emoji || "—"}${multiplier}`,
    `${fmtScore(score.total)} pts · ${fmtTopPercent(topPercent)}`,
  ].join("\n");
}
