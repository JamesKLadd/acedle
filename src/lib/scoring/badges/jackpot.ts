// Rare season-defining multipliers. Other multipliers (majors, Masters, Tour
// Finals, ranking, Channel Slam, streaks) live with the badges they belong to.

import type { BadgeDef } from "../types";
import { titlesIn } from "./helpers";

export const jackpotBadges: BadgeDef[] = [
  {
    id: "triple_crown",
    name: "Triple Crown",
    category: "jackpot",
    description: "Won three majors in one season. ×1.4.",
    evaluate: (s) => (titlesIn(s, "slam") === 3 ? { multiplier: 1.4, detail: "3 majors in one season" } : null),
  },
  {
    id: "calendar_slam",
    name: "Calendar Slam",
    category: "jackpot",
    description: "Won all four majors in one season. ×5.",
    hidden: true,
    evaluate: (s) => (titlesIn(s, "slam") === 4 ? { multiplier: 5, detail: "All four majors" } : null),
  },
  {
    id: "big_title_sweep",
    name: "Big Title Sweep",
    category: "jackpot",
    description: "Won a major, a Masters 1000 and the Tour Finals in one season. ×1.5.",
    evaluate: (s) =>
      titlesIn(s, "slam") > 0 && titlesIn(s, "masters") > 0 && titlesIn(s, "finals") > 0
        ? { multiplier: 1.5, detail: "Major + Masters + Tour Finals" }
        : null,
  },
  {
    id: "golden_season",
    name: "Golden Season",
    category: "jackpot",
    description: "Won a major and Olympic gold in the same season. ×1.5.",
    evaluate: (s) =>
      titlesIn(s, "slam") > 0 && titlesIn(s, "olympics") > 0 ? { multiplier: 1.5, detail: "Major + Olympic gold" } : null,
  },
];
