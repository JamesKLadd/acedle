import type { BadgeDef } from "../types";
import { bestTier, fmtPts, milestones, pct, perEach, plural, pts } from "./helpers";

const WIN_RATE_TIERS = [
  [0.9, 400],
  [0.8, 150],
  [0.7, 50],
] as const;
const WIN_RATE_MIN_MATCHES = 20;

const STREAK_STEPS = [
  [10, 30],
  [20, 80],
  [30, 200],
  [40, 400],
] as const;

export const matchBadges: BadgeDef[] = [
  {
    id: "match_wins",
    name: "Match Winner",
    category: "matches",
    description: `${fmtPts(3)} points per tour-level match won.`,
    evaluate: (s) => {
      const { wins, losses } = s.matches;
      return perEach(wins, 3, `${wins}–${losses}`);
    },
  },
  {
    id: "win_rate",
    name: "Win Rate",
    category: "matches",
    description: `Won 70% / 80% / 90% of matches (min. ${WIN_RATE_MIN_MATCHES} played).`,
    evaluate: (s) => {
      const { wins, losses } = s.matches;
      if (wins + losses < WIN_RATE_MIN_MATCHES) return null;
      const rate = wins / (wins + losses);
      const tier = bestTier<number>((min) => rate >= min, WIN_RATE_TIERS);
      return tier && { points: pts(tier[1]), detail: `${pct(rate)} of matches won` };
    },
  },
  {
    id: "win_streak",
    name: "On Fire",
    category: "matches",
    description: "Win streak milestones at 10, 20, 30 and 40 matches. Stacks.",
    evaluate: (s) => {
      const { points, reached } = milestones(s.matches.longestStreak, STREAK_STEPS);
      return points > 0 ? { points, count: reached, detail: `${s.matches.longestStreak}-match win streak` } : null;
    },
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    category: "jackpot",
    description: "Win streak of 30+ matches (×1.25) or 40+ matches (×2).",
    evaluate: (s) => {
      const streak = s.matches.longestStreak;
      if (streak >= 40) return { multiplier: 2, detail: `${streak} wins in a row` };
      if (streak >= 30) return { multiplier: 1.25, detail: `${streak} wins in a row` };
      return null;
    },
  },
  {
    id: "top10_wins",
    name: "Giant Killer",
    category: "matches",
    description: `${fmtPts(25)} points per win over a top-10 player.`,
    evaluate: (s) => perEach(s.matches.winsVsTop10, 25, plural(s.matches.winsVsTop10, "top-10 win")),
  },
  {
    id: "no1_wins",
    name: "Dethroner",
    category: "matches",
    description: `${fmtPts(100)} points per win over the world #1.`,
    evaluate: (s) => perEach(s.matches.winsVsNo1, 100, plural(s.matches.winsVsNo1, "win") + " over the #1"),
  },
  {
    id: "upset_wins",
    name: "Upset Artist",
    category: "matches",
    description: `${fmtPts(15)} points per win over a player ranked 50+ places higher.`,
    evaluate: (s) => perEach(s.matches.upsetWins, 15, plural(s.matches.upsetWins, "big upset")),
  },
  {
    id: "iron_man",
    name: "Iron Man",
    category: "matches",
    description: "Played 80+ tour-level matches.",
    evaluate: (s) => {
      const played = s.matches.wins + s.matches.losses;
      return played >= 80 ? { points: pts(75), detail: `${played} matches played` } : null;
    },
  },
  {
    id: "five_set_wins",
    name: "Five-Set Warrior",
    category: "matches",
    description: `${fmtPts(10)} points per five-set match won.`,
    evaluate: (s) => perEach(s.matches.fiveSetWins, 10, plural(s.matches.fiveSetWins, "five-set win")),
  },
  {
    id: "comebacks",
    name: "Escape Artist",
    category: "matches",
    description: `${fmtPts(40)} points per win after losing the first two sets.`,
    evaluate: (s) => perEach(s.matches.comebackWins, 40, plural(s.matches.comebackWins, "two-sets-down comeback")),
  },
  {
    id: "bagels",
    name: "Baker",
    category: "matches",
    description: `${fmtPts(5)} points per 6–0 set won.`,
    evaluate: (s) => perEach(s.matches.bagels, 5, plural(s.matches.bagels, "bagel")),
  },
  {
    id: "tiebreak_titan",
    name: "Tiebreak Titan",
    category: "matches",
    description: "Won 65%+ of tiebreaks (min. 15 played).",
    evaluate: (s) => {
      const { tiebreaksWon: won, tiebreaksPlayed: played } = s.matches;
      if (played < 15 || won / played < 0.65) return null;
      return { points: pts(60), detail: `${won}/${played} tiebreaks won` };
    },
  },
  {
    id: "marathon",
    name: "Marathon Man",
    category: "matches",
    description: "Won a match lasting four hours or more.",
    evaluate: (s) => {
      const minutes = s.matches.longestWinMinutes;
      if (minutes === null || minutes < 240) return null;
      return { points: pts(50), detail: `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m win` };
    },
  },
];
