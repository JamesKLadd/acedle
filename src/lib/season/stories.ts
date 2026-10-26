// Season storylines: headlines as the season goes (revenge, upsets, streaks,
// the race), the player's rivalries and an end-of-season recap. All worked
// out from the season's state, so old seasons get them too. Pure and
// client-safe.

import type { Entrant } from "../tournament";
import { CALENDAR, KNOCKOUTS, type Court } from "./calendar";
import { eventPoints, type PlayedMatch, type Rival, type SeasonState } from "./season";

export type Tone = "good" | "bad" | "info";

export type HeadlineKind =
  | "title"
  | "slam-watch"
  | "first-loss"
  | "revenge"
  | "nemesis"
  | "year-end"
  | "qualified"
  | "upset"
  | "shock"
  | "streak"
  | "race"
  | "rival"
  | "unbeaten";

export interface Headline {
  /** Index in CALENDAR. */
  event: number;
  kind: HeadlineKind;
  tone: Tone;
  text: string;
}

/** Which headlines an event keeps when it has more than MAX_PER_EVENT. */
const PRIORITY: Record<HeadlineKind, number> = {
  title: 10,
  "slam-watch": 9,
  "first-loss": 8,
  revenge: 7,
  nemesis: 7,
  "year-end": 9,
  qualified: 8,
  upset: 5,
  shock: 5,
  streak: 4,
  race: 4,
  rival: 3,
  unbeaten: 2,
};
const MAX_PER_EVENT = 3;

/** A win this unlikely is an upset; a loss this likely, a shock. */
export const UPSET_ODDS = 0.35;
export const SHOCK_ODDS = 0.7;
/** Winning streaks are news every this many wins. */
const STREAK_STEP = 10;
/** The race is news from Roland Garros on, when the Finals places start to matter. */
const RACE_NEWS_FROM = KNOCKOUTS.findIndex((e) => e.id === "rg");
const PARIS = KNOCKOUTS.length - 1;
const FINALS_INDEX = CALENDAR.length - 1;
const FINALS_PLACES = 8;

/** "Rafael Nadal ('08)" */
export const who = (r: Pick<Rival, "name" | "year">) => `${r.name} ('${String(r.year).slice(2)})`;
export const pct = (p: number) => `${Math.round(p * 100)}%`;
/** An event's name mid-sentence: "the Australian Open", "the ATP Finals", "Indian Wells". */
const named = (e: { name: string }) => (/(Open|Finals)$/.test(e.name) ? `the ${e.name}` : e.name);
const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
};

export interface Meeting {
  event: number;
  round: string;
  won: boolean;
}

export interface Rivalry {
  rival: Rival;
  wins: number;
  losses: number;
  /** In order. */
  meetings: Meeting[];
}

export interface CourtRecord {
  court: Court;
  wins: number;
  losses: number;
  points: number;
}

export interface SeasonRecap {
  /** The least likely win (under even odds). */
  biggestUpset: PlayedMatch | null;
  /** The most likely loss (over even odds). */
  toughestLoss: PlayedMatch | null;
  longestStreak: number;
  /** Courts played on, in calendar order of first appearance. */
  courts: CourtRecord[];
  nemesis: Rivalry | null;
  /** The best-placed rival in the race, with their titles. */
  topRival: { rival: Rival; place: number; points: number; titles: number } | null;
  /** The player's place in the race. */
  place: number;
}

export interface SeasonStories {
  /** Every event's headlines in calendar order, the most important first within an event. */
  headlines: Headline[];
  /** Rivals met, most meetings first. */
  rivalries: Rivalry[];
  /** The rival who beat the player most (at least twice). */
  nemesis: Rivalry | null;
  recap: SeasonRecap;
}

/** Everyone's place by points, then score (as the race table). */
function placeOf(points: ReadonlyMap<number, number>, people: readonly Rival[], playerId: number) {
  const sorted = [...people].sort(
    (a, b) => (points.get(b.playerId) ?? 0) - (points.get(a.playerId) ?? 0) || b.score - a.score,
  );
  return { place: sorted.findIndex((p) => p.playerId === playerId) + 1, leader: sorted[0] };
}

/** Each event's champion (null while unknown): a rival, or the player. */
function championsOf(state: SeasonState): (Rival | null)[] {
  const knockouts = state.knockouts.map((ko) =>
    ko.state && ko.draw && ko.state.champion !== null ? (ko.draw.entrants[ko.state.champion] as Entrant & Rival) : null,
  );
  const finals = state.finals.champion !== null ? state.finals.field[state.finals.champion] : null;
  return [...knockouts, finals];
}

export function seasonStories(state: SeasonState): SeasonStories {
  const you = state.race.find((r) => r.you)!.rival;
  const people = state.race.map((r) => r.rival);
  const champions = championsOf(state);
  const headlines: Headline[] = [];

  const h2h = new Map<number, Rivalry>();
  const rivalTitles = new Map<number, number>();
  const points = new Map<number, number>();
  let wins = 0;
  let losses = 0;
  let streak = 0;
  let longestStreak = 0;
  let titles = 0;
  let slamsPlayed = 0;
  let slamsWon = 0;
  let prevPlace: number | null = null;

  for (const [i, event] of CALENDAR.entries()) {
    const view = i < KNOCKOUTS.length ? state.knockouts[i] : state.finals;
    if (view.status === "upcoming") break;
    const news: Headline[] = [];
    const say = (kind: HeadlineKind, tone: Tone, text: string) => news.push({ event: i, kind, tone, text });

    // The player's matches here, as they happened.
    let upset: PlayedMatch | null = null;
    let shock: PlayedMatch | null = null;
    let streakNews: number | null = null;
    let beatenBy: Rival | null = null;
    for (const m of state.matches.filter((x) => x.event === i)) {
      const id = m.opponent.playerId;
      const rivalry = h2h.get(id) ?? { rival: m.opponent, wins: 0, losses: 0, meetings: [] };
      const lastLoss = rivalry.meetings.findLast((x) => !x.won);
      if (m.won) {
        if (lastLoss) {
          // A Finals group-stage loss can be avenged at the same event.
          const where = lastLoss.event === i ? `in the ${lastLoss.round.toLowerCase()}` : `at ${named(CALENDAR[lastLoss.event])}`;
          say("revenge", "good", `Revenge at ${named(event)}: you beat ${who(m.opponent)}, who beat you ${where}.`);
        } else if (m.odds <= UPSET_ODDS && (!upset || m.odds < upset.odds)) {
          upset = m;
        }
        wins++;
        streak++;
        longestStreak = Math.max(longestStreak, streak);
        if (streak % STREAK_STEP === 0) streakNews = streak;
      } else {
        beatenBy = m.opponent;
        if (losses === 0 && wins >= 5) {
          say("first-loss", "bad", `First loss of the season: ${who(m.opponent)} ends your unbeaten run at ${wins}–0.`);
        } else if (rivalry.losses >= 1) {
          say("nemesis", "bad", `${who(m.opponent)} beats you again: ${rivalry.wins}–${rivalry.losses + 1} this season.`);
        } else if (m.odds >= SHOCK_ODDS) {
          shock = m;
        }
        if (streak >= STREAK_STEP && losses > 0) say("streak", "info", `Your winning streak ends at ${streak}.`);
        losses++;
        streak = 0;
      }
      rivalry.meetings.push({ event: i, round: m.round, won: m.won });
      if (m.won) rivalry.wins++;
      else rivalry.losses++;
      h2h.set(id, rivalry);
    }
    if (upset) {
      say("upset", "good", `Upset at ${named(event)}: you beat ${who(upset.opponent)} with a ${pct(upset.odds)} chance.`);
    }
    if (shock) {
      say("shock", "bad", `Shock at ${named(event)}: beaten by ${who(shock.opponent)} in the ${shock.round.toLowerCase()}, despite a ${pct(shock.odds)} chance.`);
    }
    if (streakNews !== null && streak > 0) say("streak", "good", `${streak} wins in a row.`);

    // Once the event is over: titles, the champion and the race.
    const over = view.status === "done" || view.status === "missed";
    if (over) {
      const result = view.result;
      if (result?.title) {
        titles++;
        const flawless = state.matches.filter((m) => m.event === i).every((m) => m.sets.every(Boolean));
        say("title", "good", `${event.name} champion${flawless ? " without dropping a set" : ""}: title No. ${titles} of the season.`);
      }
      if (event.kind === "slam") {
        slamsPlayed++;
        if (result?.title) slamsWon++;
        if (result?.title && slamsWon === slamsPlayed && slamsWon >= 2) {
          say(
            "slam-watch",
            "good",
            slamsWon === 4 ? "All four Slams: the Calendar Grand Slam!" : `${slamsWon} Slams out of ${slamsWon}: the Calendar Slam is on.`,
          );
        }
        if (losses === 0 && wins > 0) say("unbeaten", "good", `Still unbeaten: ${wins}–0.`);
      }

      const champion = champions[i];
      if (champion && champion.playerId !== you.playerId) {
        const n = (rivalTitles.get(champion.playerId) ?? 0) + 1;
        rivalTitles.set(champion.playerId, n);
        if (beatenBy?.playerId === champion.playerId) {
          say("rival", "info", `${who(champion)}, who beat you, goes on to win ${named(event)}.`);
        } else if (n >= 2) {
          say("rival", "info", `${who(champion)} wins ${named(event)}: a ${ordinal(n)} title this season.`);
        } else if (i === FINALS_INDEX) {
          say("rival", "info", `${who(champion)} wins the ATP Finals.`);
        }
      }

      if (i < KNOCKOUTS.length) {
        const ko = state.knockouts[i];
        for (const [id, pts] of eventPoints(event, ko.draw!, ko.state!)) points.set(id, (points.get(id) ?? 0) + pts);
        const { place, leader } = placeOf(points, people, you.playerId);
        if (i === PARIS) {
          if (place <= FINALS_PLACES) say("qualified", "good", `Into the ATP Finals as No. ${place} in the race.`);
          else say("qualified", "bad", `Missed the ATP Finals: No. ${place} in the race.`);
        } else if (place === 1 && prevPlace !== 1 && (points.get(you.playerId) ?? 0) > 0) {
          say("race", "good", "You take the lead in the race.");
        } else if (prevPlace === 1 && place !== 1) {
          say("race", "info", `${who(leader)} takes the lead in the race.`);
        } else if (i >= RACE_NEWS_FROM && prevPlace !== null) {
          if (place <= FINALS_PLACES && prevPlace > FINALS_PLACES) {
            say("race", "good", `Into the ATP Finals places: No. ${place} in the race.`);
          } else if (place > FINALS_PLACES && prevPlace <= FINALS_PLACES) {
            say("race", "bad", `Out of the ATP Finals places: down to No. ${place}.`);
          }
        }
        prevPlace = place;
      } else if (state.done) {
        const place = state.race.findIndex((r) => r.you) + 1;
        say("year-end", place === 1 ? "good" : "info", place === 1 ? "Year-end No. 1 in the race." : `Year-end No. ${place} in the race.`);
      }
    }

    // Keep each event's biggest stories.
    headlines.push(...news.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind]).slice(0, MAX_PER_EVENT));
  }

  const rivalries = [...h2h.values()].sort(
    (a, b) =>
      b.meetings.length - a.meetings.length ||
      b.losses - a.losses ||
      b.meetings.at(-1)!.event - a.meetings.at(-1)!.event,
  );
  const nemesis =
    [...rivalries]
      .filter((r) => r.losses >= 2)
      .sort((a, b) => b.losses - a.losses || a.wins - b.wins || lastLossAt(b) - lastLossAt(a))[0] ?? null;

  return { headlines, rivalries, nemesis, recap: recapOf(state, champions, nemesis, longestStreak) };
}

const lastLossAt = (r: Rivalry) => r.meetings.findLast((m) => !m.won)?.event ?? -1;

function recapOf(
  state: SeasonState,
  champions: (Rival | null)[],
  nemesis: Rivalry | null,
  longestStreak: number,
): SeasonRecap {
  const wins = state.matches.filter((m) => m.won && m.odds < 0.5);
  const losses = state.matches.filter((m) => !m.won && m.odds > 0.5);
  const biggestUpset = wins.reduce<PlayedMatch | null>((best, m) => (!best || m.odds < best.odds ? m : best), null);
  const toughestLoss = losses.reduce<PlayedMatch | null>((worst, m) => (!worst || m.odds > worst.odds ? m : worst), null);

  const courts: CourtRecord[] = [];
  const court = (c: Court) => {
    let r = courts.find((x) => x.court === c);
    if (!r) courts.push((r = { court: c, wins: 0, losses: 0, points: 0 }));
    return r;
  };
  for (const m of state.matches) {
    const r = court(CALENDAR[m.event].court);
    if (m.won) r.wins++;
    else r.losses++;
  }
  for (const view of [...state.knockouts, state.finals]) if (view.result) court(view.event.court).points += view.result.points;

  const place = state.race.findIndex((r) => r.you) + 1;
  const best = state.race.findIndex((r) => !r.you && r.points > 0);
  const topRival =
    best === -1
      ? null
      : {
          rival: state.race[best].rival,
          place: best + 1,
          points: state.race[best].points,
          titles: champions.filter((c) => c?.playerId === state.race[best].rival.playerId).length,
        };

  return { biggestUpset, toughestLoss, longestStreak, courts, nemesis, topRival, place };
}

/** Headlines in `after` that weren't in `before` (what a match just added). */
export function newHeadlines(before: readonly Headline[], after: readonly Headline[]): Headline[] {
  const seen = new Set(before.map((h) => `${h.event}|${h.text}`));
  return after.filter((h) => !seen.has(`${h.event}|${h.text}`));
}
