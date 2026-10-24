import type { BadgeDef } from "../types";
import { bestTier, milestones, pct, plural, rankLabel } from "./helpers";

/** Points for finishing at or inside each rank. */
const RANK_TIERS = [
  [3, 300],
  [5, 200],
  [10, 120],
  [20, 60],
  [50, 25],
  [100, 5],
] as const;

const tierFor = (rank: number) => bestTier<number>((max) => rank <= max, RANK_TIERS);

/** Year-end points as a share of the #1's points, era-independent. Cumulative. */
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
    description: "Finished the season ranked #1.",
    evaluate: (s) => (s.ranking.final === 1 ? { multiplier: 2, detail: `Ranked #1 ${rankLabel(s)}` } : null),
  },
  {
    id: "rank_tier",
    name: "Top Ranked",
    category: "ranking",
    description: "Points for the final ranking: top 3 / 5 / 10 / 20 / 50 / 100.",
    evaluate: (s) => {
      const tier = tierFor(s.ranking.final);
      return tier && { points: tier[1], detail: `#${s.ranking.final} ${rankLabel(s)} (top ${tier[0]})` };
    },
  },
  {
    id: "summit",
    name: "Summit",
    category: "ranking",
    description: "Peaked in a higher ranking tier than where the season ended (half that tier's points).",
    evaluate: (s) => {
      const peak = tierFor(s.ranking.peak);
      const final = tierFor(s.ranking.final);
      if (!peak || (final && final[0] <= peak[0])) return null;
      return { points: Math.round(peak[1] / 2), detail: `Peaked at #${s.ranking.peak}` };
    },
  },
  {
    id: "weeks_at_no1",
    name: "King of the Hill",
    category: "ranking",
    description: "8 points per week ranked #1 during the season.",
    evaluate: (s) => {
      const n = s.ranking.weeksAtNo1;
      return n > 0 ? { points: n * 8, count: n, detail: `${plural(n, "week")} at #1` } : null;
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
    evaluate: (s) => (s.ranking.firstTop10Finish ? { points: 150, detail: "First top-10 finish" } : null),
  },
  {
    id: "rookie",
    name: "Rookie",
    category: "ranking",
    description: "First career season finishing inside the top 100.",
    evaluate: (s) => (s.ranking.firstTop100Finish ? { points: 50, detail: "First top-100 finish" } : null),
  },
  {
    id: "rocket",
    name: "Rocket",
    category: "ranking",
    description: `1 point per ranking place climbed during the season (max ${ROCKET_CAP}).`,
    evaluate: (s) => {
      const { start, final } = s.ranking;
      if (start === null) return { points: ROCKET_CAP, detail: `Unranked → #${final}` };
      const climbed = start - final;
      return climbed >= 10 ? { points: Math.min(climbed, ROCKET_CAP), detail: `#${start} → #${final}` } : null;
    },
  },
  {
    id: "flag_bearer",
    name: "Flag Bearer",
    category: "ranking",
    description: "Highest-ranked player from his country.",
    evaluate: (s) => (s.ranking.countryRank === 1 ? { points: 40, detail: `Top-ranked from ${s.country}` } : null),
  },
];
