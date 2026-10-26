// Season mode: a card plays today's calendar (calendar.ts) against a field of
// 40 rivals. Like tournament mode, everything follows from the setup plus the
// player's sets in order: the events are played one after another, the
// player's own matches use their sets, and every other match is decided by
// court-adjusted odds drawn from the season's seed. Pure and client-safe.

import {
  matchRandom,
  placeDraw,
  roundCount,
  tournamentState,
  type Entrant,
  type TournamentSetup,
  type TournamentState,
} from "../tournament";
import {
  CALENDAR,
  FINALS,
  FINALS_BEST_OF,
  FINALS_FIELD,
  FORMAT,
  KNOCKOUTS,
  POINTS,
  type SeasonEvent,
} from "./calendar";
import {
  courtChance,
  fatigueAfter,
  formAtNextEvent,
  matchOdds,
  nextForm,
  type CourtFactors,
  type MatchOdds,
} from "./odds";

/** A player-season in a season: the card or a rival. */
export interface Rival extends Omit<Entrant, "seed"> {
  courts: CourtFactors;
}

export interface SeasonSetup {
  /** The card playing the season. */
  you: Rival;
  /** The field: other player-seasons (one per player, none of them the card's player). */
  rivals: Rival[];
  /** For each knockout event in calendar order, the rivals (indices) entered. */
  entries: number[][];
  /** Unsigned 32-bit seed for every match the player isn't in. */
  seed: number;
  /**
   * "points": each event is seeded by race points so far (card score breaks
   * ties, so the first event goes by score). Seasons started before that was
   * added seed by card score throughout, so they replay as they were.
   */
  seeding?: "points";
}

export const RIVALS = 40;

/** One event's own seed, from the season's. */
const eventSeed = (seed: number, event: number) => Math.floor(matchRandom(seed, 7, event, 64) * 2 ** 32);

/** Seeded players per event (the top quarter, as in a real draw); the rest are drawn at random. */
const SEEDED = { slam: 8, masters: 4 } as const;

/**
 * The knockout draw for event `i` (an index in KNOCKOUTS), seeded by race
 * `points` (by player id) when the season seeds that way, else by card score.
 */
export function eventDraw(setup: SeasonSetup, i: number, points?: ReadonlyMap<number, number>): TournamentSetup {
  const kind = KNOCKOUTS[i].kind as "slam" | "masters";
  const seed = eventSeed(setup.seed, i);
  const pool: Rival[] = [setup.you, ...setup.entries[i].map((r) => setup.rivals[r])];
  const pts = (e: Omit<Entrant, "seed">) => points?.get(e.playerId) ?? 0;
  const better =
    setup.seeding === "points"
      ? (a: Omit<Entrant, "seed">, b: Omit<Entrant, "seed">) => pts(b) - pts(a) || b.score - a.score
      : undefined;
  let k = 0;
  const placed = placeDraw(pool, 0, FORMAT[kind].size, SEEDED[kind], () => matchRandom(seed, 9, k++, 64), better);
  return { tier: null, ...placed, seed };
}

const courtsOf = (e: Entrant) => (e as Entrant & { courts: CourtFactors }).courts;

/** How the matches of a knockout event are played. */
export function eventRules(event: SeasonEvent) {
  const { bestOf } = FORMAT[event.kind as "slam" | "masters"];
  return {
    bestOf: () => bestOf,
    chance: (a: Entrant, b: Entrant) =>
      courtChance({ score: a.score, courts: courtsOf(a) }, { score: b.score, courts: courtsOf(b) }, event.court),
  };
}

// ------------------------------------------------------------------ results

export type EventStatus = "upcoming" | "current" | "done" | "missed";

/** How the player's event went, once it's over. */
export interface EventResult {
  matchesWon: number;
  matchesLost: number;
  title: boolean;
  points: number;
  /** "Champion", "Final", "Semifinal", "Round of 16", "Group stage"… */
  label: string;
}

export interface KnockoutView {
  event: SeasonEvent;
  status: EventStatus;
  /** Null for an upcoming event seeded by race points: its draw is made when the event before is over. */
  draw: TournamentSetup | null;
  /** Null until the event is played. */
  state: TournamentState | null;
  result: EventResult | null;
}

/** A Finals match between two places in the field (indices in `FinalsView.field`). */
export interface FinalsMatch {
  a: number;
  b: number;
  /** Null until it's played. */
  winner: number | null;
  /** Sets won by a and b. */
  score: [number, number] | null;
  /** The player's own match: their sets so far. */
  sets: boolean[] | null;
}

export interface GroupStanding {
  player: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
}

export interface FinalsGroup {
  name: "A" | "B";
  /** Places in the field, best seed first. */
  players: number[];
  /** Three rounds of two matches. */
  matches: FinalsMatch[][];
  /** Best first, once every match is played; else in seed order. */
  standings: GroupStanding[];
}

export interface FinalsView {
  event: SeasonEvent;
  status: EventStatus;
  /** The eight qualifiers by race points (seed 1 first); empty until Paris is over. */
  field: Rival[];
  /** The player's place in the field, or null if they didn't qualify. */
  you: number | null;
  groups: FinalsGroup[];
  semifinals: FinalsMatch[];
  final: FinalsMatch | null;
  champion: number | null;
  result: EventResult | null;
}

export interface RaceEntry {
  rival: Rival;
  you: boolean;
  points: number;
}

/** The player's next match. */
export interface CurrentMatch {
  /** Index in CALENDAR. */
  event: number;
  /** "Round of 32", "Group stage", "Semifinal"… */
  round: string;
  opponent: Rival;
  bestOf: number;
  won: number;
  lost: number;
  odds: MatchOdds;
}

export interface SeasonState {
  knockouts: KnockoutView[];
  finals: FinalsView;
  current: CurrentMatch | null;
  record: { wins: number; losses: number };
  /** Ids of the events won. */
  titles: string[];
  points: number;
  /** Everyone's points so far, most first. */
  race: RaceEntry[];
  /** The player's form going into their next match, in log-odds (−FORM_MAX to FORM_MAX). */
  form: number;
  /** No match lost (so far). */
  perfect: boolean;
  /** Won all four Slams. */
  calendarSlam: boolean;
  done: boolean;
  /** How many of the given sets the season used. */
  setsUsed: number;
}

const ROUND_NAMES = ["Final", "Semifinal", "Quarterfinal", "Round of 16", "Round of 32"];
const roundLabel = (size: number, r: number) => ROUND_NAMES[roundCount(size) - 1 - r];

/** Plays out a best-of-`bestOf` match from the player's `sets` (from `cursor`). */
function playSets(sets: readonly boolean[], cursor: number, bestOf: number) {
  const need = Math.ceil(bestOf / 2);
  const played: boolean[] = [];
  let won = 0;
  let lost = 0;
  while (won < need && lost < need && cursor + played.length < sets.length) {
    const s = sets[cursor + played.length];
    played.push(s);
    if (s) won++;
    else lost++;
  }
  return { played, won, lost, over: won === need || lost === need, youWon: won === need };
}

/** The whole season after the player's `sets` (true = set won), in order. */
export function seasonState(setup: SeasonSetup, sets: readonly boolean[]): SeasonState {
  const { you } = setup;
  const people = [you, ...setup.rivals];
  const pointsOf = new Map<number, number>(people.map((p) => [p.playerId, 0]));
  const award = (playerId: number, pts: number) => pointsOf.set(playerId, (pointsOf.get(playerId) ?? 0) + pts);

  let cursor = 0;
  let form = 0;
  let wins = 0;
  let losses = 0;
  const titles: string[] = [];
  let current: CurrentMatch | null = null;

  const knockouts: KnockoutView[] = [];
  for (const [i, event] of KNOCKOUTS.entries()) {
    if (current) {
      const draw = setup.seeding === "points" ? null : eventDraw(setup, i);
      knockouts.push({ event, status: "upcoming", draw, state: null, result: null });
      continue;
    }
    const draw = eventDraw(setup, i, pointsOf);

    if (i > 0) form = formAtNextEvent(form);
    const state = tournamentState(draw, sets.slice(cursor), eventRules(event));
    cursor += state.setsUsed;
    const size = draw.entrants.length;

    // The player's matches, in order: form and fatigue follow them.
    let setsHere = 0;
    for (const m of state.rounds.flat().filter((x) => x.sets !== null)) {
      setsHere += m.sets!.length;
      if (m.winner === null) continue;
      const won = m.winner === draw.you;
      if (won) wins++;
      else losses++;
      form = nextForm(form, won);
    }

    if (state.current) {
      const opponent = draw.entrants[state.current.opponent] as Entrant & Rival;
      current = {
        event: CALENDAR.indexOf(event),
        round: roundLabel(size, state.current.round),
        opponent,
        bestOf: state.current.bestOf,
        won: state.current.won,
        lost: state.current.lost,
        odds: matchOdds(you, opponent, event.court, form, fatigueAfter(setsHere)),
      };
      knockouts.push({ event, status: "current", draw, state, result: null });
      continue;
    }

    // Over: everyone's points for how far they got.
    const table = POINTS[event.kind as "slam" | "masters"];
    const won = new Map<number, number>();
    for (const m of state.rounds.flat()) if (m.winner !== null) won.set(m.winner, (won.get(m.winner) ?? 0) + 1);
    draw.entrants.forEach((e, idx) => award(e.playerId, table[won.get(idx) ?? 0]));
    const yourWins = won.get(draw.you) ?? 0;
    const title = state.champion === draw.you;
    if (title) titles.push(event.id);
    knockouts.push({
      event,
      status: "done",
      draw,
      state,
      result: {
        matchesWon: yourWins,
        matchesLost: title ? 0 : 1,
        title,
        points: table[yourWins],
        label: title ? "Champion" : roundLabel(size, yourWins),
      },
    });
  }

  const raceAfterKnockouts = current ? null : standingsOf(people, pointsOf, you);

  // ------------------------------------------------------------ the Finals
  let finals: FinalsView;
  if (!raceAfterKnockouts) {
    finals = emptyFinals("upcoming");
  } else {
    const field = raceAfterKnockouts.slice(0, FINALS_FIELD).map((r) => r.rival);
    const youAt = field.findIndex((r) => r.playerId === you.playerId);
    const played = playFinals(setup, field, youAt === -1 ? null : youAt, sets, cursor, formAtNextEvent(form));
    cursor = played.cursor;
    form = played.form;
    wins += played.wins;
    losses += played.losses;
    for (const [place, pts] of played.points) award(field[place].playerId, pts);
    if (played.current) current = played.current;
    if (played.view.champion !== null && played.view.champion === youAt) titles.push(FINALS.id);
    finals = played.view;
  }

  const race = standingsOf(people, pointsOf, you);
  return {
    knockouts,
    finals,
    current,
    record: { wins, losses },
    titles,
    points: pointsOf.get(you.playerId) ?? 0,
    race,
    form,
    perfect: losses === 0,
    calendarSlam: KNOCKOUTS.filter((e) => e.kind === "slam").every((e) => titles.includes(e.id)),
    done: current === null && finals.status !== "upcoming",
    setsUsed: cursor,
  };
}

/** Everyone by points (then score), the player marked. */
function standingsOf(people: readonly Rival[], points: ReadonlyMap<number, number>, you: Rival): RaceEntry[] {
  return people
    .map((rival) => ({ rival, you: rival.playerId === you.playerId, points: points.get(rival.playerId) ?? 0 }))
    .sort((a, b) => b.points - a.points || b.rival.score - a.rival.score);
}

function emptyFinals(status: EventStatus): FinalsView {
  return {
    event: FINALS,
    status,
    field: [],
    you: null,
    groups: [],
    semifinals: [],
    final: null,
    champion: null,
    result: null,
  };
}

/** Group A takes seeds 1, 4, 5 and 8; group B 2, 3, 6 and 7 (as places 0–7). */
const GROUPS: [number[], number[]] = [
  [0, 3, 4, 7],
  [1, 2, 5, 6],
];
/** Round-robin rounds, as pairs of positions within a group. */
const SCHEDULE: [number, number][][] = [
  [
    [0, 3],
    [1, 2],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 1],
    [2, 3],
  ],
];

/**
 * The Finals for `field` (by race points), with the player at place `youAt`
 * (or not in it): the round robin, then the semifinals and final. The
 * player's matches take their sets from `cursor`.
 */
function playFinals(
  setup: SeasonSetup,
  field: Rival[],
  youAt: number | null,
  sets: readonly boolean[],
  start: number,
  startForm: number,
) {
  const seed = eventSeed(setup.seed, CALENDAR.length - 1);
  const points = new Map<number, number>();
  const award = (place: number, pts: number) => points.set(place, (points.get(place) ?? 0) + pts);
  // The player's run, updated by their matches as they're played.
  const run = {
    cursor: start,
    form: startForm,
    wins: 0,
    losses: 0,
    setsHere: 0,
    current: null as CurrentMatch | null,
  };
  let n = 0;

  /** Plays one match: the player's from their sets, the rest by the odds. */
  const play = (a: number, b: number, round: string): FinalsMatch => {
    const k = n++;
    const yours = youAt !== null && (a === youAt || b === youAt);
    if (!yours) {
      const pa = courtChance(field[a], field[b], FINALS.court);
      const winner = matchRandom(seed, 1, k, 64) < pa ? a : b;
      const straight = matchRandom(seed, 2, k, 64) < 0.55;
      const loserSets = straight ? 0 : 1;
      return { a, b, winner, score: winner === a ? [2, loserSets] : [loserSets, 2], sets: null };
    }
    // The player's later matches wait for their current one.
    if (run.current) return { a, b, winner: null, score: null, sets: [] };
    const result = playSets(sets, run.cursor, FINALS_BEST_OF);
    run.cursor += result.played.length;
    run.setsHere += result.played.length;
    const youAreA = a === youAt;
    if (!result.over) {
      const opponent = field[youAreA ? b : a];
      run.current = {
        event: CALENDAR.length - 1,
        round,
        opponent,
        bestOf: FINALS_BEST_OF,
        won: result.won,
        lost: result.lost,
        odds: matchOdds(setup.you, opponent, FINALS.court, run.form, fatigueAfter(run.setsHere)),
      };
      return { a, b, winner: null, score: null, sets: result.played };
    }
    run.form = nextForm(run.form, result.youWon);
    if (result.youWon) run.wins++;
    else run.losses++;
    const winner = result.youWon === youAreA ? a : b;
    const score: [number, number] = youAreA ? [result.won, result.lost] : [result.lost, result.won];
    return { a, b, winner, score, sets: result.played };
  };

  // Round robin.
  const groups: FinalsGroup[] = GROUPS.map((players, g) => ({
    name: g === 0 ? "A" : "B",
    players,
    matches: [],
    standings: [],
  }));
  for (const pairs of SCHEDULE) {
    for (const group of groups) {
      group.matches.push(pairs.map(([x, y]) => play(group.players[x], group.players[y], "Group stage")));
    }
  }
  for (const group of groups) {
    const done = group.matches.flat().every((m) => m.winner !== null);
    group.standings = standings(group, done);
    for (const m of group.matches.flat()) if (m.winner !== null) award(m.winner, POINTS.finals.roundRobinWin);
  }

  let semifinals: FinalsMatch[] = [];
  let final: FinalsMatch | null = null;
  let champion: number | null = null;
  const groupsDone = groups.every((g) => g.matches.flat().every((m) => m.winner !== null));
  if (groupsDone) {
    const [a, b] = groups.map((g) => g.standings);
    semifinals = [play(a[0].player, b[1].player, "Semifinal"), play(b[0].player, a[1].player, "Semifinal")];
    for (const m of semifinals) if (m.winner !== null) award(m.winner, POINTS.finals.semifinalWin);
    if (semifinals.every((m) => m.winner !== null)) {
      final = play(semifinals[0].winner!, semifinals[1].winner!, "Final");
      if (final.winner !== null) {
        award(final.winner, POINTS.finals.finalWin);
        champion = final.winner;
      }
    }
  }

  // The player's result, once their Finals are over.
  let result: EventResult | null = null;
  const status: EventStatus = youAt === null ? "missed" : run.current ? "current" : "done";
  if (status === "done" && youAt !== null) {
    const inSemis = semifinals.some((m) => m.a === youAt || m.b === youAt);
    const inFinal = final !== null && (final.a === youAt || final.b === youAt);
    result = {
      matchesWon: run.wins,
      matchesLost: run.losses,
      title: champion === youAt,
      points: points.get(youAt) ?? 0,
      label: champion === youAt ? "Champion" : inFinal ? "Final" : inSemis ? "Semifinal" : "Group stage",
    };
  }

  const view: FinalsView = {
    event: FINALS,
    status,
    field,
    you: youAt,
    groups,
    semifinals,
    final,
    champion,
    result,
  };
  return { view, points, ...run };
}

/**
 * A group's table. Once it's complete: most wins first; two players level on
 * wins go by their match against each other, more than two by share of sets
 * won, then seed.
 */
function standings(group: FinalsGroup, complete: boolean): GroupStanding[] {
  const rows = group.players.map((player) => ({ player, wins: 0, losses: 0, setsWon: 0, setsLost: 0 }));
  const row = (p: number) => rows.find((r) => r.player === p)!;
  for (const m of group.matches.flat()) {
    if (m.winner === null || !m.score) continue;
    const [sa, sb] = m.score;
    const a = row(m.a);
    const b = row(m.b);
    a.setsWon += sa;
    a.setsLost += sb;
    b.setsWon += sb;
    b.setsLost += sa;
    if (m.winner === m.a) {
      a.wins++;
      b.losses++;
    } else {
      b.wins++;
      a.losses++;
    }
  }
  if (!complete) return rows;
  const share = (r: GroupStanding) => r.setsWon / Math.max(1, r.setsWon + r.setsLost);
  const headToHead = (x: number, y: number) =>
    group.matches.flat().find((m) => (m.a === x && m.b === y) || (m.a === y && m.b === x))?.winner;
  return [...rows].sort((x, y) => {
    if (x.wins !== y.wins) return y.wins - x.wins;
    const level = rows.filter((r) => r.wins === x.wins);
    if (level.length === 2) return headToHead(x.player, y.player) === x.player ? -1 : 1;
    return share(y) - share(x) || x.player - y.player;
  });
}

/** What a season's row keeps up to date as it's played (listings, the leaderboard). */
export interface SeasonSummary {
  wins: number;
  losses: number;
  titles: number;
  points: number;
  calendarSlam: boolean;
  finished: boolean;
}

export const seasonSummary = (s: SeasonState): SeasonSummary => ({
  wins: s.record.wins,
  losses: s.record.losses,
  titles: s.titles.length,
  points: s.points,
  calendarSlam: s.calendarSlam,
  finished: s.done,
});
