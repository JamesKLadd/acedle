import { loadSeasons } from "../data/seasons";
import { scoreSeason } from "./index";

let sortedTotals: number[] | null = null;

/** Every rollable season's score, ascending. Computed once per server (~60 ms). */
export function seasonTotals(): readonly number[] {
  sortedTotals ??= [...loadSeasons().values()]
    .flat()
    .map((s) => scoreSeason(s).total)
    .sort((a, b) => a - b);
  return sortedTotals;
}

/**
 * Percentage of rollable seasons scoring at least `score` (so lower is
 * better): 0.03 for the very best season, 100 for the worst. Every season is
 * equally likely, so this is also the chance of rolling this well.
 */
export function topPercent(score: number, totals: readonly number[] = seasonTotals()): number {
  let lo = 0;
  let hi = totals.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (totals[mid] < score) lo = mid + 1;
    else hi = mid;
  }
  return (100 * Math.max(1, totals.length - lo)) / totals.length;
}
