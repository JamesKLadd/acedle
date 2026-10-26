// Season mode's odds. Scores span five orders of magnitude, so they're
// compressed first (to the power STRENGTH_POWER, as in tournaments): against a field of the
// best player-seasons, a great card should be a favourite and an ordinary
// one a real underdog, not certain wins and certain losses. Strength is then
// scaled by how well the player-season did on the event's surface that
// year. The player's own matches also carry form (recent results) and
// fatigue (sets already played at the event).

import type { PlayerSeason, Surface, SurfaceRecord } from "../data/types";
import { STRENGTH_POWER } from "../tournament";
import type { Court } from "./calendar";

export type CourtFactors = Record<Court, number>;

export const NEUTRAL: CourtFactors = { Hard: 1, Clay: 1, Grass: 1, Indoor: 1 };

/** Matches of the season's overall win rate a surface record is blended with, so a handful of matches can't swing it. */
const PRIOR = 8;
/** How strongly surface form moves strength (on the odds scale): 0.5 = square root. */
const WEIGHT = 0.5;
const MIN_FACTOR = 0.5;
const MAX_FACTOR = 2;

const odds = (p: number) => p / (1 - p);

/**
 * How much stronger or weaker a player-season is on each court than overall,
 * from its wins and losses there: 1 = no different. Indoor courts count hard
 * and carpet (carpet was the indoor surface until 2009).
 */
export function courtFactors(bySurface: PlayerSeason["matches"]["bySurface"]): CourtFactors {
  if (!bySurface) return NEUTRAL;
  const records = Object.values(bySurface) as SurfaceRecord[];
  const total = (k: keyof SurfaceRecord, list = records) => list.reduce((n, r) => n + r[k], 0);
  const wins = total("wins");
  const played = wins + total("losses");
  // Overall rate, nudged off 0 and 1 for seasons with very few matches.
  const overall = (wins + 1) / (played + 2);
  const factor = (...surfaces: Surface[]) => {
    const list = surfaces.flatMap((s) => (bySurface[s] ? [bySurface[s]] : []));
    const w = total("wins", list);
    const n = w + total("losses", list);
    const rate = (w + PRIOR * overall) / (n + PRIOR);
    const f = (odds(rate) / odds(overall)) ** WEIGHT;
    return Math.round(Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, f)) * 1000) / 1000;
  };
  return { Hard: factor("Hard"), Clay: factor("Clay"), Grass: factor("Grass"), Indoor: factor("Hard", "Carpet") };
}

export interface Contender {
  score: number;
  courts: CourtFactors;
}

const strength = (c: Contender) => Math.max(1, c.score) ** STRENGTH_POWER;

/** Chance that `a` beats `b` on scores alone. */
export function scoreChance(a: Contender, b: Contender) {
  const sa = strength(a);
  return sa / (sa + strength(b));
}

/** Chance that `a` beats `b` on `court`: their share of the two court-adjusted strengths. */
export function courtChance(a: Contender, b: Contender, court: Court) {
  const sa = strength(a) * a.courts[court];
  return sa / (sa + strength(b) * b.courts[court]);
}

// Form and fatigue move the player's odds on the log-odds scale, so they
// matter most in even matches: about ±8 points at 50%, less for big
// favourites and long shots.
const logit = (p: number) => Math.log(p / (1 - p));
const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/** Form, in log-odds: each match won adds FORM_WIN up to FORM_MAX; a loss takes FORM_LOSS off. */
export const FORM_WIN = 0.1;
export const FORM_LOSS = 0.35;
export const FORM_MAX = 0.35;

/** The player's form after a match. */
export const nextForm = (form: number, won: boolean) =>
  won ? Math.min(FORM_MAX, form + FORM_WIN) : Math.max(-FORM_MAX, form - FORM_LOSS);

/** Form fades by half from one event to the next. */
export const formAtNextEvent = (form: number) => form / 2;

/** Fatigue, in log-odds: each set already played at the event takes FATIGUE_PER_SET off, up to FATIGUE_MAX. */
export const FATIGUE_PER_SET = 0.025;
export const FATIGUE_MAX = 0.4;

export const fatigueAfter = (setsPlayed: number) => Math.min(FATIGUE_MAX, setsPlayed * FATIGUE_PER_SET);

/** The player's odds for a match, and what each part added (as chances). */
export interface MatchOdds {
  /** Scores alone. */
  base: number;
  /** What the court adds (or takes away). */
  court: number;
  /** What form adds (or takes away). */
  form: number;
  /** What fatigue takes away (0 or more). */
  fatigue: number;
  /** What the player plays at, 1–99%. */
  total: number;
}

/** The player's odds for a match: score, then court, form and fatigue (both in log-odds). */
export function matchOdds(you: Contender, opponent: Contender, court: Court, form: number, fatigue: number): MatchOdds {
  const clamp = (p: number) => Math.min(0.99, Math.max(0.01, p));
  const base = scoreChance(you, opponent);
  const onCourt = courtChance(you, opponent, court);
  const withForm = logistic(logit(onCourt) + form);
  const total = clamp(logistic(logit(onCourt) + form - fatigue));
  return { base, court: onCourt - base, form: withForm - onCourt, fatigue: withForm - total, total };
}
