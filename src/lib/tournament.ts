// Tournament mode: the rolled player joins a 16-player draw of random
// player-seasons, seeded by score. The player's own matches are decided by a
// timing game (best of 3 sets, the final best of 5); every other match is
// decided by the two scores' odds, drawn from the tournament's seed so a
// replay always gives the same results. Pure and client-safe: the state is
// derived from the setup plus the player's set results, nothing else.

export interface Entrant {
  playerId: number;
  year: number;
  name: string;
  /** IOC code. */
  country: string;
  finalRank: number;
  score: number;
  /** 1–16, by score. */
  seed: number;
}

export interface TournamentSetup {
  /** 16 entrants in draw order: matches are (0, 1), (2, 3), … */
  entrants: Entrant[];
  /** Index of the player's own entrant. */
  you: number;
  /** Unsigned 32-bit seed for the matches the player doesn't play. */
  seed: number;
}

export const DRAW_SIZE = 16;
export const ROUNDS = ["Round of 16", "Quarterfinal", "Semifinal", "Final"] as const;
export const ROUNDS_SHORT = ["R16", "QF", "SF", "F"] as const;

/** Sets needed to win: best of 3, the final best of 5. */
export const bestOf = (round: number) => (round === ROUNDS.length - 1 ? 5 : 3);

/** Draw position of each seed, top to bottom (1 and 2 can only meet in the final). */
const SEED_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15];

/**
 * Chance that a player scoring `a` beats one scoring `b`: their share of the
 * two scores. Scores span 1,000 to 100 million, so ratios (not differences)
 * keep it meaningful: twice the score is a 67% favourite, ten times is 91%.
 */
export function winChance(a: number, b: number): number {
  const x = Math.max(1, a);
  const y = Math.max(1, b);
  return x / (x + y);
}

/**
 * The timing game for a set at `chance` (the player's odds): the green zone's
 * share of the track and how long the ball takes to cross it. Big favourites
 * get a wide zone and a slow ball; big underdogs a sliver and a fast one.
 */
export function gameParams(chance: number) {
  const p = Math.min(1, Math.max(0, chance));
  return { zone: 0.07 + 0.33 * p, passMs: Math.round(450 + 1150 * p) };
}

/** How near the line (as a share of the track) a tap has to be for a line review. */
export const CLOSE_CALL = 0.02;

export interface LineCall {
  /** The ball was in: on the green or its lines (lines are in, as in tennis). */
  in: boolean;
  /** The line it was nearest: the zone's left or right edge. */
  side: "left" | "right";
  /** Close enough to the line to show the line review. */
  close: boolean;
  /**
   * For the review: how far the ball mark missed the line by (out), or how
   * far it reached onto the line (in), 1–30 mm.
   */
  mm: number;
}

/** The call for a tap with the ball at `pos`, the green zone at `center` (all shares of the track). */
export function lineCall(pos: number, center: number, zone: number): LineCall {
  const margin = zone / 2 - Math.abs(pos - center);
  // Narrow zones get a narrower band, so not every hit on them goes to review.
  const band = Math.min(CLOSE_CALL, zone * 0.12);
  return {
    in: margin >= 0,
    side: pos < center ? "left" : "right",
    close: Math.abs(margin) <= band,
    mm: Math.min(30, Math.max(1, Math.round((Math.abs(margin) / band) * 30))),
  };
}

/**
 * Seeds the 16 entrants by score (ties keep their order) and places them in
 * the draw. `you` is the player's index in `pool`; returns it in the draw.
 */
export function seedDraw(pool: readonly Omit<Entrant, "seed">[], you: number, seed: number): TournamentSetup {
  if (pool.length !== DRAW_SIZE) throw new Error(`A draw needs ${DRAW_SIZE} entrants`);
  const bySeed = pool.map((e, i) => ({ e, i })).sort((a, b) => b.e.score - a.e.score);
  const entrants = SEED_ORDER.map((s) => ({ ...bySeed[s - 1].e, seed: s }));
  const drawYou = SEED_ORDER.indexOf(bySeed.findIndex((x) => x.i === you) + 1);
  return { entrants, you: drawYou, seed: seed >>> 0 };
}

/** Deterministic [0, 1) for one match, from the tournament's seed. */
export function matchRandom(seed: number, round: number, match: number): number {
  let t = (seed ^ Math.imul(round * DRAW_SIZE + match + 1, 0x9e3779b1)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return ((r ^ (r >>> 14)) >>> 0) / 2 ** 32;
}

export interface Match {
  round: number;
  /** Position within the round, top to bottom. */
  index: number;
  /** Entrant indices; null until the feeding match is decided. */
  a: number | null;
  b: number | null;
  winner: number | null;
  /** The player's own match: their sets so far, true for each set won. */
  sets: boolean[] | null;
}

export interface TournamentState {
  /** rounds[r] lists that round's matches (8, 4, 2, 1). */
  rounds: Match[][];
  /** The player's undecided match (with its set score so far); null once they're out or champion. */
  current: { round: number; index: number; opponent: number; bestOf: number; won: number; lost: number } | null;
  /** Rounds the player won (0–4, 4 = champion), once their run is over; null while it goes on. */
  roundsWon: number | null;
  /** The round the player is in (or went out in). */
  round: number;
  champion: number | null;
}

/** The whole draw after the player's `sets` (true = set won), in order. */
export function tournamentState(setup: TournamentSetup, sets: readonly boolean[]): TournamentState {
  const { you, seed } = setup;
  const rounds: Match[][] = [];
  let alive: (number | null)[] = setup.entrants.map((_, i) => i);
  let next = 0;
  let current: TournamentState["current"] = null;
  let roundsWon: number | null = null;
  let round = 0;

  for (let r = 0; r < ROUNDS.length; r++) {
    const matches: Match[] = [];
    for (let m = 0; m < alive.length / 2; m++) {
      const a = alive[2 * m];
      const b = alive[2 * m + 1];
      const match: Match = { round: r, index: m, a, b, winner: null, sets: null };
      if (a === you || b === you) {
        const opponent = (a === you ? b : a)!;
        const need = Math.ceil(bestOf(r) / 2);
        const played: boolean[] = [];
        let won = 0;
        let lost = 0;
        while (won < need && lost < need && next < sets.length) {
          const s = sets[next++];
          played.push(s);
          if (s) won++;
          else lost++;
        }
        match.sets = played;
        round = r;
        if (won === need) {
          match.winner = you;
          if (r === ROUNDS.length - 1) roundsWon = ROUNDS.length;
        } else if (lost === need) {
          match.winner = opponent;
          roundsWon = r;
        } else {
          current = { round: r, index: m, opponent, bestOf: bestOf(r), won, lost };
        }
      } else if (a !== null && b !== null) {
        const e = setup.entrants;
        match.winner = matchRandom(seed, r, m) < winChance(e[a].score, e[b].score) ? a : b;
      }
      matches.push(match);
    }
    rounds.push(matches);
    alive = matches.map((m) => m.winner);
  }

  const champion = rounds[ROUNDS.length - 1][0].winner;
  return { rounds, current, roundsWon, round, champion };
}

/** How far a finished run went, e.g. "Champion", "Semifinals". */
export function runLabel(roundsWon: number): string {
  return ["Round of 16", "Quarterfinals", "Semifinals", "Runner-up", "Champion"][roundsWon] ?? "—";
}
