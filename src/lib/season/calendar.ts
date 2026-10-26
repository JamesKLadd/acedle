// Season mode's calendar: today's four Slams and nine Masters in date order,
// then the ATP Finals for the top 8 of the points race. Every season uses
// the same calendar, whatever year the card is from.

/** Court surfaces as season mode plays them: indoor hard counts apart from outdoor. */
export type Court = "Hard" | "Clay" | "Grass" | "Indoor";

export type EventKind = "slam" | "masters" | "finals";

export interface SeasonEvent {
  id: string;
  name: string;
  /** Short name for tight spaces, e.g. "AO", "IW". */
  short: string;
  kind: EventKind;
  court: Court;
  /** Month it's played in, 1–12. */
  month: number;
}

export const CALENDAR: readonly SeasonEvent[] = [
  { id: "ao", name: "Australian Open", short: "AO", kind: "slam", court: "Hard", month: 1 },
  { id: "iw", name: "Indian Wells", short: "IW", kind: "masters", court: "Hard", month: 3 },
  { id: "mia", name: "Miami", short: "MIA", kind: "masters", court: "Hard", month: 3 },
  { id: "mc", name: "Monte Carlo", short: "MC", kind: "masters", court: "Clay", month: 4 },
  { id: "mad", name: "Madrid", short: "MAD", kind: "masters", court: "Clay", month: 5 },
  { id: "rom", name: "Rome", short: "ROM", kind: "masters", court: "Clay", month: 5 },
  { id: "rg", name: "Roland Garros", short: "RG", kind: "slam", court: "Clay", month: 6 },
  { id: "wim", name: "Wimbledon", short: "WIM", kind: "slam", court: "Grass", month: 7 },
  { id: "can", name: "Canada", short: "CAN", kind: "masters", court: "Hard", month: 8 },
  { id: "cin", name: "Cincinnati", short: "CIN", kind: "masters", court: "Hard", month: 8 },
  { id: "uso", name: "US Open", short: "USO", kind: "slam", court: "Hard", month: 9 },
  { id: "sha", name: "Shanghai", short: "SHA", kind: "masters", court: "Hard", month: 10 },
  { id: "par", name: "Paris", short: "PAR", kind: "masters", court: "Indoor", month: 11 },
  { id: "fin", name: "ATP Finals", short: "FIN", kind: "finals", court: "Indoor", month: 11 },
];

/** The knockout events (everything but the Finals), in order. */
export const KNOCKOUTS = CALENDAR.filter((e) => e.kind !== "finals");
export const FINALS = CALENDAR[CALENDAR.length - 1];

/** Draw size and sets per match for a knockout event. */
export const FORMAT = {
  slam: { size: 32, bestOf: 5 },
  masters: { size: 16, bestOf: 3 },
} as const;

/** The Finals: two round-robin groups of 4, the top 2 of each to the semifinals. All best of 3. */
export const FINALS_FIELD = 8;
export const FINALS_BEST_OF = 3;

/**
 * Ranking points for how far a player got, today's ATP values. Knockouts are
 * indexed by rounds won (0 = lost in the first round … all = champion).
 */
export const POINTS = {
  // Our 32-player Slams start at the real Round of 32.
  slam: [100, 200, 400, 800, 1300, 2000],
  // Our 16-player Masters start at the real Round of 16.
  masters: [100, 200, 400, 650, 1000],
  finals: { roundRobinWin: 200, semifinalWin: 400, finalWin: 500 },
} as const;

/** The most points a season can earn: every title, the Finals unbeaten. */
export const MAX_POINTS =
  4 * POINTS.slam[POINTS.slam.length - 1] +
  9 * POINTS.masters[POINTS.masters.length - 1] +
  3 * POINTS.finals.roundRobinWin +
  POINTS.finals.semifinalWin +
  POINTS.finals.finalWin;
