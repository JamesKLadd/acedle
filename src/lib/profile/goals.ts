// Collection goals: things to collect across the daily rolls (countries,
// years, Slam winners…) and to win with them in tournament and season mode.
// Each has bronze, silver and gold levels, set so that at one roll a day a
// typical player reaches them in about two weeks, three months and a year.
// Pure: worked out from the user's rolls and seasons, so they count rolls
// made before goals existed.

import { isChampion, type RunResult, type TierId } from "../tournament";

export const MEDALS = ["bronze", "silver", "gold"] as const;
export type Medal = (typeof MEDALS)[number];

/** What goals need from a roll. */
export interface GoalRoll {
  id: string;
  year: number;
  playerId: number;
  country: string;
  finalRank: number;
  /** "R", "L", "U" or "A". */
  hand: string;
  /** The season includes a Grand Slam title. */
  wonSlam: boolean;
  /** The roll's finished tournament, if any. */
  tournament: (RunResult & { setsLost: number }) | null;
}

/** What goals need from a season-mode season. */
export interface GoalSeason {
  rollId: string;
  status: "active" | "finished" | "abandoned";
  titles: number;
}

export type GoalGroup = "collect" | "play";

interface GoalDef {
  id: string;
  name: string;
  /** What it asks for, e.g. "Roll players from different countries". */
  description: string;
  /** What's counted, e.g. "countries". */
  unit: string;
  group: GoalGroup;
  /** Counts needed for bronze, silver and gold. */
  levels: readonly [number, number, number];
  count: (rolls: readonly GoalRoll[], seasons: readonly GoalSeason[]) => number;
}

const distinct = <T>(items: readonly T[], key: (t: T) => unknown) => new Set(items.map(key)).size;
/** Different player-seasons among `rolls` that pass `test`: rolling the same season twice counts once. */
const seasonsWhere = (rolls: readonly GoalRoll[], test: (r: GoalRoll) => boolean) =>
  distinct(rolls.filter(test), (r) => `${r.year}:${r.playerId}`);
const titlesOf = (rolls: readonly GoalRoll[]) => rolls.flatMap((r) => (r.tournament && isChampion(r.tournament) ? [r.tournament] : []));
/** The tiers "every tier" asks for; tournaments from before tiers count as titles but not here. */
const TIERS_TO_WIN: readonly TierId[] = ["250", "500", "1000", "slam"];

export const GOALS: readonly GoalDef[] = [
  {
    id: "countries",
    name: "Globetrotter",
    description: "Roll players from different countries",
    unit: "countries",
    group: "collect",
    levels: [10, 30, 50],
    count: (rolls) => distinct(rolls, (r) => r.country),
  },
  {
    id: "years",
    name: "Time traveller",
    description: "Roll seasons from different years",
    unit: "years",
    group: "collect",
    levels: [10, 30, 37],
    count: (rolls) => distinct(rolls, (r) => r.year),
  },
  {
    id: "players",
    name: "Roster",
    description: "Roll different players",
    unit: "players",
    group: "collect",
    levels: [15, 80, 250],
    count: (rolls) => distinct(rolls, (r) => r.playerId),
  },
  {
    id: "top10",
    name: "Top 10",
    description: "Roll seasons that finished in the top 10",
    unit: "seasons",
    group: "collect",
    levels: [2, 10, 35],
    count: (rolls) => seasonsWhere(rolls, (r) => r.finalRank <= 10),
  },
  {
    id: "slam-winners",
    name: "Major winners",
    description: "Roll seasons with a Grand Slam title",
    unit: "seasons",
    group: "collect",
    levels: [1, 3, 10],
    count: (rolls) => seasonsWhere(rolls, (r) => r.wonSlam),
  },
  {
    id: "no1",
    name: "World No. 1",
    description: "Roll seasons that finished at No. 1",
    unit: "seasons",
    group: "collect",
    levels: [1, 2, 4],
    count: (rolls) => seasonsWhere(rolls, (r) => r.finalRank === 1),
  },
  {
    id: "lefties",
    name: "Lefties",
    description: "Roll left-handed players' seasons",
    unit: "seasons",
    group: "collect",
    levels: [3, 15, 50],
    count: (rolls) => seasonsWhere(rolls, (r) => r.hand === "L"),
  },
  {
    id: "champion",
    name: "Champion",
    description: "Win tournaments in tournament mode",
    unit: "titles",
    group: "play",
    levels: [1, 5, 20],
    count: (rolls) => titlesOf(rolls).length,
  },
  {
    id: "every-tier",
    name: "Every tier",
    description: "Win a 250, a 500, a 1000 and a Grand Slam",
    unit: "tiers",
    group: "play",
    levels: [2, 3, 4],
    count: (rolls) => distinct(titlesOf(rolls).filter((t) => t.tier && TIERS_TO_WIN.includes(t.tier)), (t) => t.tier),
  },
  {
    id: "flawless",
    name: "Flawless",
    description: "Win a tournament without dropping a set",
    unit: "titles",
    group: "play",
    levels: [1, 3, 10],
    count: (rolls) => titlesOf(rolls).filter((t) => t.setsLost === 0).length,
  },
  {
    id: "season-titles",
    name: "Tour winner",
    description: "Win events in season mode",
    unit: "titles",
    group: "play",
    levels: [1, 10, 30],
    count: (_, seasons) => seasons.reduce((n, s) => n + s.titles, 0),
  },
  {
    id: "seasons",
    name: "Full calendar",
    description: "Finish seasons in season mode",
    unit: "seasons",
    group: "play",
    levels: [1, 3, 10],
    count: (_, seasons) => seasons.filter((s) => s.status === "finished").length,
  },
];

export interface GoalProgress {
  id: string;
  name: string;
  description: string;
  unit: string;
  group: GoalGroup;
  levels: readonly [number, number, number];
  count: number;
  /** The best medal reached, if any. */
  medal: Medal | null;
  /** The count the next medal needs (null once gold). */
  next: number | null;
}

/** Every goal's progress for these rolls and seasons. */
export function goalProgress(rolls: readonly GoalRoll[], seasons: readonly GoalSeason[]): GoalProgress[] {
  return GOALS.map(({ count, ...def }) => {
    const n = count(rolls, seasons);
    const reached = def.levels.filter((l) => n >= l).length;
    return {
      ...def,
      count: n,
      medal: reached ? MEDALS[reached - 1] : null,
      next: reached < def.levels.length ? def.levels[reached] : null,
    };
  });
}

/** Medals reached, counting each level (gold in a goal = 3). */
export const medalCount = (progress: readonly GoalProgress[]) =>
  progress.reduce((n, g) => n + (g.medal ? MEDALS.indexOf(g.medal) + 1 : 0), 0);

/** Each goal's best medal in `after` that `before` didn't have. */
export function newMedals(before: readonly GoalProgress[], after: readonly GoalProgress[]) {
  const had = new Map(before.map((g) => [g.id, g.medal ? MEDALS.indexOf(g.medal) + 1 : 0]));
  return after.flatMap((g) => {
    const from = had.get(g.id) ?? 0;
    const to = g.medal ? MEDALS.indexOf(g.medal) + 1 : 0;
    return to > from ? [{ goal: g, medal: MEDALS[to - 1] }] : [];
  });
}

/**
 * Medals a card brought: everything reached with it (its roll, its
 * tournament and its seasons) that wasn't reached without it.
 */
export function medalsFromCard(rollId: string, rolls: readonly GoalRoll[], seasons: readonly GoalSeason[]) {
  const before = goalProgress(
    rolls.filter((r) => r.id !== rollId),
    seasons.filter((s) => s.rollId !== rollId),
  );
  return newMedals(before, goalProgress(rolls, seasons));
}
