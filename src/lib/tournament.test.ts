import { describe, expect, it } from "vitest";

import { DRAW_SIZE, gameParams, lineCall, matchRandom, seedDraw, tournamentState, winChance, type Entrant } from "./tournament";

const entrant = (i: number, score: number): Omit<Entrant, "seed"> => ({
  playerId: i,
  year: 2000 + i,
  name: `Player ${i}`,
  country: "SUI",
  finalRank: i + 1,
  score,
});

// Scores 16k down to 1k; the player is the 8th best (score 9,000).
const pool = Array.from({ length: DRAW_SIZE }, (_, i) => entrant(i, (DRAW_SIZE - i) * 1000));
const setup = seedDraw(pool, 7, 12345);

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
