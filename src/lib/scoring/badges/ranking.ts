import type { BadgeDef } from "../types";
import { bestTier, fmtPts, milestones, pct, plural, pts, rankLabel } from "./helpers";

/** Multiplier for the final ranking. This is what separates elite seasons from the pack. */
const RANK_MULTIPLIERS = [
  [3, 10],
  [5, 8],
  [10, 6],
  [20, 3],
  [50, 1.5],
] as const;

/** Points (in units) for the best rank reached mid-season, used by Summit at half value. */
const PEAK_POINTS = [
  [3, 300],
  [5, 200],
  [10, 120],
  [20, 60],
  [50, 25],
] as const;

const tier = <T extends ReadonlyArray<readonly [number, number]>>(rank: number, tiers: T) =>
  bestTier<number>((max) => rank <= max, tiers);

/** Year-end points as a share of the #1's points, era-independent. Cumulative, in units. */
const POINT_SHARE_STEPS = [
  [0.1, 20],
  [0.25, 40],
  [0.5, 80],
  [0.75, 120],
  [1, 200],
] as const;

const ROCKET_CAP = 150;

export const rankingBadges: BadgeDef[] = [
  {
    id: "year_end_no1",
    name: "World No. 1",
    category: "jackpot",
    description: "Finished the season ranked #1. ×1.5, on top of the Top 3 multiplier.",
    evaluate: (s) => (s.ranking.final === 1 ? { multiplier: 1.5, detail: `Ranked #1 ${rankLabel(s)}` } : null),
  },
  {
    id: "rank_tier",
    name: "Top Ranked",
    category: "ranking",
    description: `Final ranking multiplier: top 3 ×10, top 5 ×8, top 10 ×6, top 20 ×3, top 50 ×1.5.`,
    evaluate: (s) => {
      const t = tier(s.ranking.final, RANK_MULTIPLIERS);
      return t && { multiplier: t[1], detail: `#${s.ranking.final} ${rankLabel(s)} (top ${t[0]})` };
    },
  },
  {
    id: "summit",
    name: "Summit",
    category: "ranking",
    description: "Peaked in a higher ranking tier than where the season ended.",
    evaluate: (s) => {
      const peak = tier(s.ranking.peak, PEAK_POINTS);
      const final = tier(s.ranking.final, PEAK_POINTS);
      if (!peak || (final && final[0] <= peak[0])) return null;
      return { points: pts(peak[1] / 2), detail: `Peaked at #${s.ranking.peak}` };
    },
  },
  {
    id: "weeks_at_no1",
    name: "King of the Hill",
    category: "ranking",
    description: `${fmtPts(8)} points per week ranked #1 during the season.`,
    evaluate: (s) => {
      const n = s.ranking.weeksAtNo1;
      return n > 0 ? { points: n * pts(8), count: n, detail: `${plural(n, "week")} at #1` } : null;
    },
  },
  {
    id: "point_haul",
    name: "Point Haul",
    category: "ranking",
    description:
      "Ranking points as a share of the #1's. Stacks at 10%, 25%, 50%, 75% and 100% so it works the same in every era.",
    evaluate: (s) => {
      const { finalPoints, no1Points } = s.ranking;
      if (!finalPoints || !no1Points) return null;
      const share = finalPoints / no1Points;
      const { points, reached } = milestones(share, POINT_SHARE_STEPS);
      return points > 0 ? { points, count: reached, detail: `${pct(share)} of the #1's points` } : null;
    },
  },
  {
    id: "breakthrough",
    name: "Breakthrough",
    category: "ranking",
    description: "First career season finishing inside the top 10.",
    evaluate: (s) => (s.ranking.firstTop10Finish ? { points: pts(150), detail: "First top-10 finish" } : null),
  },
  {
    id: "rookie",
    name: "Rookie",
    category: "ranking",
    description: "First career season finishing inside the top 100.",
    evaluate: (s) => (s.ranking.firstTop100Finish ? { points: pts(50), detail: "First top-100 finish" } : null),
  },
  {
    id: "rocket",
    name: "Rocket",
    category: "ranking",
    description: `${fmtPts(1)} points per ranking place climbed during the season (max ${ROCKET_CAP} places).`,
    evaluate: (s) => {
      const { start, final } = s.ranking;
      if (start === null) return { points: pts(ROCKET_CAP), detail: `Unranked → #${final}` };
      const climbed = start - final;
      return climbed >= 10 ? { points: pts(Math.min(climbed, ROCKET_CAP)), detail: `#${start} → #${final}` } : null;
    },
  },
  {
    id: "flag_bearer",
    name: "Flag Bearer",
    category: "ranking",
    description: "Highest-ranked player from his country.",
    evaluate: (s) => (s.ranking.countryRank === 1 ? { points: pts(40), detail: `Top-ranked from ${s.country}` } : null),
  },
];
