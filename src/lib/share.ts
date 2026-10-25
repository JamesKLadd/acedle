// Wordle-style share text for a roll.

import type { PlayerSeason } from "./data/types";
import { fmtDate, fmtMult, fmtScore, fmtTopPercent } from "./format";
import { revealTimeline } from "./reveal";
import type { BadgeCategory, ScoreResult } from "./scoring/types";
import { ROUNDS } from "./tournament";

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
 * 🏆 Won the tournament        (once the roll's tournament is over)
 *
 * The share button adds the roll's link as a last line.
 */
export function shareText({
  day,
  season: s,
  score,
  topPercent,
  tournament = null,
}: {
  day: string;
  season: PlayerSeason;
  score: ScoreResult;
  topPercent: number;
  /** Rounds won in the roll's finished tournament, if any. */
  tournament?: number | null;
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
    ...(tournament === null ? [] : [tournamentLine(tournament)]),
  ].join("\n");
}

/** "🏆 Won the tournament", "🎾 Tournament: out in the semifinal" */
export function tournamentLine(roundsWon: number): string {
  if (roundsWon >= ROUNDS.length) return "🏆 Won the tournament";
  if (roundsWon === ROUNDS.length - 1) return "🥈 Tournament: runner-up";
  return `🎾 Tournament: out in the ${ROUNDS[roundsWon].toLowerCase()}`;
}
