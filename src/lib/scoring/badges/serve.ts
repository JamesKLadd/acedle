// Serve stats are recorded from 1991; these badges are skipped for seasons without them.

import type { BadgeDef } from "../types";
import { pct } from "./helpers";

export const serveBadges: BadgeDef[] = [
  {
    id: "ace_machine",
    name: "Ace Machine",
    category: "serve",
    description: "20 points per 100 aces served.",
    evaluate: (s) => {
      const hundreds = Math.floor((s.serve?.aces ?? 0) / 100);
      return hundreds > 0 ? { points: hundreds * 20, count: hundreds, detail: `${s.serve!.aces} aces` } : null;
    },
  },
  {
    id: "big_server",
    name: "Big Server",
    category: "serve",
    description: "Aced on 10%+ of service points (min. 1,000 points).",
    evaluate: (s) => {
      if (!s.serve || s.serve.servePoints < 1000) return null;
      const rate = s.serve.aces / s.serve.servePoints;
      return rate >= 0.1 ? { points: 60, detail: `${pct(rate)} ace rate` } : null;
    },
  },
  {
    id: "clutch",
    name: "Clutch",
    category: "serve",
    description: "Saved 65%+ of break points faced (min. 50 faced).",
    evaluate: (s) => {
      if (!s.serve || s.serve.breakPointsFaced < 50) return null;
      const rate = s.serve.breakPointsSaved / s.serve.breakPointsFaced;
      return rate >= 0.65 ? { points: 50, detail: `${pct(rate)} break points saved` } : null;
    },
  },
  {
    id: "hold_steady",
    name: "Hold Steady",
    category: "serve",
    description: "Held serve in 88%+ of service games (min. 200 games).",
    evaluate: (s) => {
      if (!s.serve || s.serve.serviceGames < 200) return null;
      const broken = s.serve.breakPointsFaced - s.serve.breakPointsSaved;
      const rate = (s.serve.serviceGames - broken) / s.serve.serviceGames;
      return rate >= 0.88 ? { points: 60, detail: `${pct(rate)} of service games held` } : null;
    },
  },
];
