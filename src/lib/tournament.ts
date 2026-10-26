// Tournament mode: the rolled player joins a draw of random player-seasons,
// seeded by score. Tiers set the draw's size, who's in it and how long the
// matches are (TIERS). The player's own matches are decided by a timing game;
// every other match is decided by the two scores' odds, drawn from the
// tournament's seed so a replay always gives the same results. Pure and
// client-safe: the state is derived from the setup plus the player's set
// results, nothing else.

export interface Entrant {
  playerId: number;
  year: number;
  name: string;
  /** IOC code. */
  country: string;
  finalRank: number;
  score: number;
  /** 1 to the draw size, by score. */
  seed: number;
}

export type TierId = "250" | "500" | "1000" | "slam";

export interface Tier {
  /** Null for runs from before tiers. */
  id: TierId | null;
  /** "250", "Grand Slam". */
  name: string;
  size: 16 | 32;
  /** The other entrants' final ranks, inclusive. */
  ranks: readonly [number, number];
  /** Sets per match: best of `bestOf`, the final best of `finalBestOf`. */
  bestOf: 3 | 5;
  finalBestOf: 3 | 5;
}

export const TIERS: readonly Tier[] = [
  { id: "250", name: "250", size: 16, ranks: [20, 100], bestOf: 3, finalBestOf: 3 },
  { id: "500", name: "500", size: 16, ranks: [1, 75], bestOf: 3, finalBestOf: 3 },
  { id: "1000", name: "1000", size: 16, ranks: [1, 50], bestOf: 3, finalBestOf: 5 },
  { id: "slam", name: "Grand Slam", size: 32, ranks: [1, 32], bestOf: 5, finalBestOf: 5 },
];

/** Runs from before tiers: 16 players from anywhere in the top 100, the final best of 5. */
const CLASSIC: Tier = { id: null, name: "Tournament", size: 16, ranks: [1, 100], bestOf: 3, finalBestOf: 5 };

export const tierOf = (id: TierId | null | undefined): Tier => TIERS.find((t) => t.id === id) ?? CLASSIC;
export const isTierId = (x: unknown): x is TierId => TIERS.some((t) => t.id === x);

export interface TournamentSetup {
  /** Null for runs from before tiers. */
  tier: TierId | null;
  /** The entrants in draw order: matches are (0, 1), (2, 3), … */
  entrants: Entrant[];
  /** Index of the player's own entrant. */
  you: number;
  /** Unsigned 32-bit seed for the matches the player doesn't play. */
  seed: number;
  /**
   * Started before odds were compressed (oddsFor): it keeps playing on the
   * plain share of the scores, so its draw replays as it was.
   */
  legacyOdds?: boolean;
}

/** Rounds in a draw of `size`: 4 for 16 players, 5 for 32. */
export const roundCount = (size: number) => Math.round(Math.log2(size));

const ROUND_NAMES = ["Final", "Semifinal", "Quarterfinal", "Round of 16", "Round of 32"];
const ROUND_SHORT = ["F", "SF", "QF", "R16", "R32"];

/** "Round of 32" … "Final", for round `r` of a draw of `size`. */
export const roundName = (size: number, r: number) => ROUND_NAMES[roundCount(size) - 1 - r];
export const roundShort = (size: number, r: number) => ROUND_SHORT[roundCount(size) - 1 - r];

/** Best of how many sets round `r` is. */
export function bestOf(tier: Tier, r: number) {
  return r === roundCount(tier.size) - 1 ? tier.finalBestOf : tier.bestOf;
}

/**
 * Draw position of each seed, top to bottom: 1 and 2 can only meet in the
 * final, 1–4 in the semifinals, and so on. The 16 order predates tiers and
 * stays as it was.
 */
const SEED_ORDER: Record<16 | 32, number[]> = {
  16: [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15],
  32: [
    1, 32, 16, 17, 9, 24, 8, 25, 5, 28, 12, 21, 13, 20, 4, 29, 3, 30, 14, 19, 11, 22, 6, 27, 7, 26, 10, 23, 15, 18, 2,
    31,
  ],
};

/** Scores are taken to this power before they're compared: ten times the score is about twice the strength. */
export const STRENGTH_POWER = 0.3;

/**
 * Chance that a player scoring `a` beats one scoring `b`: their share of the
 * two strengths, each the score to the power STRENGTH_POWER. Scores span
 * 1,000 to 100 million, so comparing them straight made great seasons
 * near-certain winners and ordinary ones hopeless; compressed, ten times the
 * score is a 67% favourite and a thousand times 89%.
 */
export function winChance(a: number, b: number): number {
  const x = Math.max(1, a) ** STRENGTH_POWER;
  const y = Math.max(1, b) ** STRENGTH_POWER;
  return x / (x + y);
}

/** The plain share of the two scores: tournaments started before compressed odds. */
export function legacyChance(a: number, b: number): number {
  const x = Math.max(1, a);
  const y = Math.max(1, b);
  return x / (x + y);
}

/** The odds a tournament plays on. */
export const oddsFor = (setup: Pick<TournamentSetup, "legacyOdds">) => (setup.legacyOdds ? legacyChance : winChance);

/**
 * The timing game for a set at `chance` (the player's odds): the green zone's
 * share of the track (its lines included) and how long the ball takes to
 * cross it. Big favourites get a wide zone and a slow ball; big underdogs
 * little more than the two lines and a fast ball. The zone grows slowly at
 * first, so long odds stay long.
 */
export function gameParams(chance: number) {
  const p = Math.min(1, Math.max(0, chance));
  return { zone: 0.022 + 0.378 * p ** 1.5, passMs: Math.round(380 + 1220 * p) };
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
 * Seeds the entrants by score (ties keep their order) and places them in a
 * `tier` draw. `you` is the player's index in `pool`; returns it in the draw.
 */
export function seedDraw(
  pool: readonly Omit<Entrant, "seed">[],
  you: number,
  seed: number,
  tier: TierId | null,
): TournamentSetup {
  const placed = placeDraw(pool, you, tierOf(tier).size);
  return { tier, ...placed, seed: seed >>> 0 };
}

/**
 * Places `pool` into a draw of `size`, numbered by score. The best `seeded`
 * take their seeded places; the rest fill the other places in an order
 * shuffled by `random` (all seeded by default). `you` is an index in `pool`,
 * returned as one in the draw.
 */
export function placeDraw(
  pool: readonly Omit<Entrant, "seed">[],
  you: number,
  size: 16 | 32,
  seeded: number = size,
  random: () => number = Math.random,
): { entrants: Entrant[]; you: number } {
  if (pool.length !== size) throw new Error(`A draw needs ${size} entrants`);
  const bySeed = pool.map((e, i) => ({ e, i })).sort((a, b) => b.e.score - a.e.score);
  const order = [...SEED_ORDER[size]];
  // The unseeded, shuffled into the unseeded places.
  const open = order.flatMap((s, place) => (s > seeded ? [place] : []));
  const unseeded = open.map((place) => order[place]);
  for (let i = unseeded.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]];
  }
  open.forEach((place, k) => (order[place] = unseeded[k]));
  const entrants = order.map((s) => ({ ...bySeed[s - 1].e, seed: s }));
  return { entrants, you: order.indexOf(bySeed.findIndex((x) => x.i === you) + 1) };
}

/** Deterministic [0, 1) for one match of a draw of `size`, from the tournament's seed. */
export function matchRandom(seed: number, round: number, match: number, size = 16): number {
  let t = (seed ^ Math.imul(round * size + match + 1, 0x9e3779b1)) >>> 0;
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
  /** rounds[r] lists that round's matches (… 8, 4, 2, 1). */
  rounds: Match[][];
  /** The player's undecided match (with its set score so far); null once they're out or champion. */
  current: { round: number; index: number; opponent: number; bestOf: number; won: number; lost: number } | null;
  /** Rounds the player won (all of them = champion), once their run is over; null while it goes on. */
  roundsWon: number | null;
  /** The round the player is in (or went out in). */
  round: number;
  champion: number | null;
  /** How many of the given sets the player's matches used (the rest belong after the run). */
  setsUsed: number;
}

/** Overrides for a draw played outside tournament mode (season mode's events). */
export interface DrawRules {
  /** Best of how many sets round `r` is (default: the tier's). */
  bestOf?: (r: number) => number;
  /** Chance that entrant `a` beats `b` in a match the player isn't in (default: the tournament's odds on the scores). */
  chance?: (a: Entrant, b: Entrant) => number;
}

/** The whole draw after the player's `sets` (true = set won), in order. */
export function tournamentState(
  setup: TournamentSetup,
  sets: readonly boolean[],
  rules: DrawRules = {},
): TournamentState {
  const { you, seed } = setup;
  const tier = tierOf(setup.tier);
  const setsOf = rules.bestOf ?? ((r: number) => bestOf(tier, r));
  const odds = oddsFor(setup);
  const chance = rules.chance ?? ((a: Entrant, b: Entrant) => odds(a.score, b.score));
  const size = setup.entrants.length;
  const count = roundCount(size);
  const rounds: Match[][] = [];
  let alive: (number | null)[] = setup.entrants.map((_, i) => i);
  let next = 0;
  let current: TournamentState["current"] = null;
  let roundsWon: number | null = null;
  let round = 0;

  for (let r = 0; r < count; r++) {
    const matches: Match[] = [];
    for (let m = 0; m < alive.length / 2; m++) {
      const a = alive[2 * m];
      const b = alive[2 * m + 1];
      const match: Match = { round: r, index: m, a, b, winner: null, sets: null };
      if (a === you || b === you) {
        const opponent = (a === you ? b : a)!;
        const need = Math.ceil(setsOf(r) / 2);
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
          if (r === count - 1) roundsWon = count;
        } else if (lost === need) {
          match.winner = opponent;
          roundsWon = r;
        } else {
          current = { round: r, index: m, opponent, bestOf: setsOf(r), won, lost };
        }
      } else if (a !== null && b !== null) {
        const e = setup.entrants;
        match.winner = matchRandom(seed, r, m, size) < chance(e[a], e[b]) ? a : b;
      }
      matches.push(match);
    }
    rounds.push(matches);
    alive = matches.map((m) => m.winner);
  }

  const champion = rounds[count - 1][0].winner;
  return { rounds, current, roundsWon, round, champion, setsUsed: next };
}

/** How far a finished run in a draw of `size` went, e.g. "Champion", "Semifinals". */
export function runLabel(roundsWon: number, size: number): string {
  const count = roundCount(size);
  if (roundsWon >= count) return "Champion";
  if (roundsWon === count - 1) return "Runner-up";
  const name = roundName(size, roundsWon);
  return name.startsWith("Round") ? name : `${name}s`;
}

/** A finished run: its tier and how many rounds the player won. */
export interface RunResult {
  tier: TierId | null;
  roundsWon: number;
}

export const isChampion = (run: RunResult) => run.roundsWon >= roundCount(tierOf(run.tier).size);

/** How the tiers read in sentences: "the 500", "the Grand Slam", "the tournament". */
export const tierPhrase = (tier: TierId | null) => (tier ? `the ${tierOf(tier).name}` : "the tournament");

/** How a tier's draw plays: "16 players ranked 20–100 · best of 3". */
export function tierFormat(tier: Tier): string {
  const sets =
    tier.bestOf === tier.finalBestOf ? `best of ${tier.bestOf}` : `best of ${tier.bestOf}, the final best of ${tier.finalBestOf}`;
  return `${tier.size} players ranked ${tier.ranks[0]}–${tier.ranks[1]} · ${sets}`;
}
