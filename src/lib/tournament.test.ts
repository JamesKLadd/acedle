import { describe, expect, it } from "vitest";

import {
  gameParams,
  lineCall,
  matchRandom,
  roundName,
  runLabel,
  seedDraw,
  tierOf,
  TIERS,
  tournamentState,
  winChance,
  type Entrant,
} from "./tournament";

const entrant = (i: number, score: number): Omit<Entrant, "seed"> => ({
  playerId: i,
  year: 2000 + i,
  name: `Player ${i}`,
  country: "SUI",
  finalRank: i + 1,
  score,
});

// Scores 16k down to 1k; the player is the 8th best (score 9,000). A run
// from before tiers (16 players, the final best of 5).
const poolOf = (n: number) => Array.from({ length: n }, (_, i) => entrant(i, (n - i) * 1000));
const pool = poolOf(16);
const setup = seedDraw(pool, 7, 12345, null);

describe("winChance", () => {
  it("is the share of the two scores", () => {
    expect(winChance(1, 1)).toBe(0.5);
    expect(winChance(2000, 1000)).toBeCloseTo(2 / 3);
    expect(winChance(1000, 10_000)).toBeCloseTo(1 / 11);
    expect(winChance(0, 0)).toBe(0.5);
  });
});

describe("gameParams", () => {
  it("gives favourites a wider zone and a slower ball", () => {
    const fav = gameParams(0.9);
    const dog = gameParams(0.1);
    expect(fav.zone).toBeGreaterThan(dog.zone);
    expect(fav.passMs).toBeGreaterThan(dog.passMs);
    expect(gameParams(2)).toEqual(gameParams(1));
  });

  it("leaves long shots little more than the lines and a fast ball", () => {
    expect(gameParams(0).zone).toBeLessThan(0.025);
    expect(gameParams(0).passMs).toBeLessThan(400);
    // A 10% underdog gets well under a tenth of the track.
    expect(gameParams(0.1).zone).toBeLessThan(0.04);
    expect(gameParams(1).zone).toBeCloseTo(0.4);
  });
});

describe("tiers", () => {
  it("sets the draw size and match length", () => {
    expect(TIERS.map((t) => [t.id, t.size, t.ranks, t.bestOf, t.finalBestOf])).toEqual([
      ["250", 16, [20, 100], 3, 3],
      ["500", 16, [1, 75], 3, 3],
      ["1000", 16, [1, 50], 3, 5],
      ["slam", 32, [1, 32], 5, 5],
    ]);
    expect(tierOf(null)).toMatchObject({ size: 16, bestOf: 3, finalBestOf: 5 });
  });

  it("names the rounds by draw size", () => {
    expect([0, 1, 2, 3, 4].map((r) => roundName(32, r))).toEqual([
      "Round of 32",
      "Round of 16",
      "Quarterfinal",
      "Semifinal",
      "Final",
    ]);
    expect(roundName(16, 0)).toBe("Round of 16");
    expect([0, 2, 3, 4].map((n) => runLabel(n, 16))).toEqual(["Round of 16", "Semifinals", "Runner-up", "Champion"]);
    expect([0, 4, 5].map((n) => runLabel(n, 32))).toEqual(["Round of 32", "Runner-up", "Champion"]);
  });

  it("seeds so the top seeds meet as late as they can", () => {
    for (const size of [16, 32]) {
      const tier = TIERS.find((t) => t.size === size)!.id;
      const { entrants } = seedDraw(poolOf(size), 0, 1, tier);
      const seeds = entrants.map((e) => e.seed);
      expect([...seeds].sort((a, b) => a - b)).toEqual(Array.from({ length: size }, (_, i) => i + 1));
      // Each section of the draw holds exactly one of the seeds that size: halves one of 1–2, quarters 1–4…
      for (let part = 2; part <= size / 2; part *= 2) {
        for (let i = 0; i < size; i += size / part) {
          expect(seeds.slice(i, i + size / part).filter((s) => s <= part)).toHaveLength(1);
        }
      }
    }
  });

  it("plays a Grand Slam as five best-of-five rounds", () => {
    const slam = seedDraw(poolOf(32), 31, 7, "slam");
    expect(slam.entrants[slam.you].seed).toBe(32);
    const s = tournamentState(slam, []);
    expect(s.rounds.map((r) => r.length)).toEqual([16, 8, 4, 2, 1]);
    expect(s.current).toMatchObject({ round: 0, bestOf: 5 });
    expect(tournamentState(slam, [true, true, false, false, false])).toMatchObject({ roundsWon: 0 });
    const champ = tournamentState(slam, Array(15).fill(true));
    expect(champ).toMatchObject({ roundsWon: 5, champion: slam.you });
  });

  it("plays a 250 best of 3 throughout", () => {
    const t = seedDraw(pool, 7, 3, "250");
    expect(tournamentState(t, Array(6).fill(true)).current).toMatchObject({ round: 3, bestOf: 3 });
    expect(tournamentState(t, Array(8).fill(true)).roundsWon).toBe(4);
  });
});

describe("lineCall", () => {
  it("calls the ball in on the green and its lines, out past them", () => {
    expect(lineCall(0.5, 0.5, 0.2)).toMatchObject({ in: true, close: false });
    expect(lineCall(0.6, 0.5, 0.2)).toMatchObject({ in: true, side: "right", close: true });
    expect(lineCall(0.4, 0.5, 0.2)).toMatchObject({ in: true, side: "left", close: true });
    expect(lineCall(0.3, 0.5, 0.2)).toMatchObject({ in: false, side: "left", close: false });
  });

  it("reviews taps near the line, by how near", () => {
    const justOut = lineCall(0.601, 0.5, 0.2);
    expect(justOut).toMatchObject({ in: false, close: true });
    expect(justOut.mm).toBeLessThanOrEqual(2);
    const clipped = lineCall(0.599, 0.5, 0.2);
    expect(clipped).toMatchObject({ in: true, close: true });
    const wide = lineCall(0.619, 0.5, 0.2);
    expect(wide).toMatchObject({ in: false, close: true });
    expect(wide.mm).toBeGreaterThan(25);
    expect(lineCall(0.625, 0.5, 0.2).close).toBe(false);
  });

  it("narrows the review band for narrow zones", () => {
    // A 0.08 zone reviews within 0.0096 of the line, not 0.02.
    expect(lineCall(0.5 + 0.04 + 0.009, 0.5, 0.08).close).toBe(true);
    expect(lineCall(0.5 + 0.04 + 0.012, 0.5, 0.08).close).toBe(false);
    expect(lineCall(0.5, 0.5, 0.08).close).toBe(false);
  });
});

describe("seedDraw", () => {
  it("seeds by score so 1 and 2 sit at opposite ends", () => {
    expect(setup.entrants.map((e) => e.seed)).toEqual([1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15]);
    expect(setup.entrants[0].score).toBe(16_000);
    expect(setup.entrants[14].score).toBe(15_000);
  });

  it("finds the player in the draw", () => {
    expect(setup.entrants[setup.you]).toMatchObject({ playerId: 7, seed: 8 });
  });
});

describe("matchRandom", () => {
  it("is deterministic and spread out", () => {
    expect(matchRandom(1, 0, 0)).toBe(matchRandom(1, 0, 0));
    const xs = Array.from({ length: 2000 }, (_, i) => matchRandom(99, i % 4, i));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(0.5, 1);
  });
});

describe("tournamentState", () => {
  it("starts in the round of 16 against the neighbouring entrant", () => {
    const s = tournamentState(setup, []);
    expect(s.current).toMatchObject({ round: 0, bestOf: 3, won: 0, lost: 0 });
    expect(setup.entrants[s.current!.opponent].seed).toBe(9);
    expect(s.roundsWon).toBeNull();
    // Other first-round matches are decided; the player's isn't.
    expect(s.rounds[0].filter((m) => m.winner !== null)).toHaveLength(7);
  });

  it("goes out after losing two sets", () => {
    const s = tournamentState(setup, [true, false, false]);
    expect(s.current).toBeNull();
    expect(s.roundsWon).toBe(0);
    expect(s.rounds[0][s.rounds[0].findIndex((m) => m.sets)].winner).not.toBe(setup.you);
    // The rest of the draw plays out.
    expect(s.champion).not.toBeNull();
  });

  it("plays best of 5 in the final and crowns the player", () => {
    const toFinal = [true, true, true, true, true, true];
    expect(tournamentState(setup, toFinal).current).toMatchObject({ round: 3, bestOf: 5 });
    const s = tournamentState(setup, [...toFinal, true, false, true, false, true]);
    expect(s.roundsWon).toBe(4);
    expect(s.champion).toBe(setup.you);
  });

  it("ignores sets after the run is over", () => {
    expect(tournamentState(setup, [false, false, true, true])).toMatchObject({ roundsWon: 0, current: null });
  });

  it("gives every other match the same result on a replay", () => {
    const a = tournamentState(setup, [false, false]);
    const b = tournamentState(setup, [false, false]);
    expect(a.rounds).toEqual(b.rounds);
  });

  it("lets favourites win the computed matches about as often as their odds", () => {
    let favWins = 0;
    let expected = 0;
    for (let seed = 0; seed < 400; seed++) {
      const s = tournamentState({ ...setup, seed }, [false, false]);
      for (const m of s.rounds[0]) {
        if (m.sets) continue;
        const [a, b] = [setup.entrants[m.a!], setup.entrants[m.b!]];
        const fav = a.score >= b.score ? m.a : m.b;
        expected += winChance(Math.max(a.score, b.score), Math.min(a.score, b.score));
        if (m.winner === fav) favWins++;
      }
    }
    expect(favWins / expected).toBeCloseTo(1, 1);
  });
});
