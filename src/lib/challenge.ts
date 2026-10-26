// The daily challenge: each UTC day everyone takes the same card into the
// same tournament draw, and runs are ranked by how far they got. The tier
// builds through the week to a Grand Slam on Sunday. The server makes and
// stores each day's challenge (challenge-store.ts); this module is the pure,
// client-safe part: the schedule, results and the share text.

import { roundShort, runLabel, tierOf, tournamentState, type TierId, type TournamentSetup } from "./tournament";

/** The first challenge's day: challenge No. 1. */
export const FIRST_CHALLENGE = "2026-10-26";

/** The tier on each UTC weekday (0 = Sunday): 250 Monday to Wednesday, 500 Thursday and Friday, 1000 Saturday, Grand Slam Sunday. */
const TIER_BY_WEEKDAY: readonly TierId[] = ["slam", "250", "250", "250", "500", "500", "1000"];

const DAY_MS = 86_400_000;
const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A ?day or [day] value that names a challenge day (from the first to `today`), or null. */
export function challengeDay(value: unknown, today: string): string | null {
  if (typeof value !== "string" || !ISO_DAY.test(value) || Number.isNaN(Date.parse(value))) return null;
  return value >= FIRST_CHALLENGE && value <= today ? value : null;
}

export const challengeTier = (day: string): TierId => TIER_BY_WEEKDAY[new Date(dayMs(day)).getUTCDay()];

/** No. 1 on FIRST_CHALLENGE, counting up a day at a time. */
export const challengeNumber = (day: string) => Math.round((dayMs(day) - dayMs(FIRST_CHALLENGE)) / DAY_MS) + 1;

/** How a run went, from the draw and the player's sets. */
export interface ChallengeOutcome {
  /** Null while the run goes on. */
  roundsWon: number | null;
  champion: boolean;
  setsWon: number;
  setsLost: number;
  /** "Champion", "Runner-up", "Quarterfinals"…, once it's over. */
  label: string | null;
}

export function challengeOutcome(setup: TournamentSetup, sets: readonly boolean[]): ChallengeOutcome {
  const state = tournamentState(setup, sets);
  const used = sets.slice(0, state.setsUsed);
  const size = setup.entrants.length;
  return {
    roundsWon: state.roundsWon,
    champion: state.roundsWon !== null && state.champion === setup.you,
    setsWon: used.filter(Boolean).length,
    setsLost: used.filter((s) => !s).length,
    label: state.roundsWon === null ? null : runLabel(state.roundsWon, size),
  };
}

/**
 * Wordle-style share text: the challenge, the card, a line of sets per round
 * (🟩 won, 🟥 lost) and how far the run went.
 *
 * Acedle Challenge #12 · Grand Slam
 * '09 Marat Safin · seed 14 of 32
 * R32 🟩🟩🟩
 * R16 🟩🟥🟩🟩
 * QF 🟥🟩🟥🟥
 * Quarterfinals
 *
 * The share button adds the challenge's link as a last line.
 */
export function challengeShareText(
  day: string,
  setup: TournamentSetup,
  sets: readonly boolean[],
  card: { year: number; name: string },
): string {
  const state = tournamentState(setup, sets);
  const size = setup.entrants.length;
  const rounds = state.rounds.flatMap((round, r) =>
    round
      .filter((m) => m.sets && m.sets.length > 0)
      .map((m) => `${roundShort(size, r)} ${m.sets!.map((s) => (s ? "🟩" : "🟥")).join("")}`),
  );
  const outcome = challengeOutcome(setup, sets);
  return [
    `Acedle Challenge #${challengeNumber(day)} · ${tierOf(setup.tier).name}`,
    `'${String(card.year).slice(2)} ${card.name} · seed ${setup.entrants[setup.you].seed} of ${size}`,
    ...rounds,
    outcome.champion ? "🏆 Champion" : (outcome.label ?? "In progress"),
  ].join("\n");
}
