// The live season after the Sackmann snapshot (June 2026). Two sources:
//
// - Tennis My Life (stats.tennismylife.org): ATP match results in Sackmann's
//   column format, updated daily. Players carry ATP codes ("D643") instead of
//   Sackmann's numeric ids, and tourney_date is the match day, not the start.
// - Tennis Abstract (tennisabstract.com, Jeff Sackmann's site): the current
//   ATP ranking list (rank, name, country, birth date), updated weekly. Every
//   list we fetch is kept in data/live/, so the weekly history builds up.
//
// Ranking points and the weeks between fetched lists come from the rank and
// points TML records for each player at each tournament.
//
// Everything here is pure, so it can be tested without the raw files.

import type { PlayerSeason } from "../../src/lib/data/types";

export type Row = Record<string, string>;

export interface PlayerInfo {
  name: string;
  hand: PlayerSeason["hand"];
  dob: number | null;
  country: string;
  heightCm: number | null;
}

export interface RankEntry {
  rank: number;
  player: number;
  points: number | null;
}

/** "Félix Auger-Aliassime" → "felixaugeraliassime" */
export function normName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Stable id for a player Sackmann's data doesn't know, from their ATP code. */
export function syntheticId(atpCode: string): number {
  return 2_000_000 + parseInt(atpCode, 36);
}

const ymdToDay = (ymd: number) =>
  Date.UTC(Math.floor(ymd / 10000), (Math.floor(ymd / 100) % 100) - 1, ymd % 100) / 86_400_000;
const dayToYmd = (day: number) => {
  const d = new Date(day * 86_400_000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};

/** The Monday on or before a date (ranking lists are published on Mondays). */
export function mondayOf(ymd: number): number {
  const day = ymdToDay(ymd);
  const weekday = (new Date(day * 86_400_000).getUTCDay() + 6) % 7; // Monday = 0
  return dayToYmd(day - weekday);
}

export function addDaysYmd(ymd: number, n: number): number {
  return dayToYmd(ymdToDay(ymd) + n);
}

// ------------------------------------------------------------------ players

/**
 * Maps players from another source to Sackmann ids: by name and birth date,
 * then by name alone when that name is unique in Sackmann's player list.
 */
export function playerMatcher(sackmann: ReadonlyMap<number, PlayerInfo>) {
  const byNameDob = new Map<string, number>();
  const byName = new Map<string, number | null>();
  for (const [id, p] of sackmann) {
    const n = normName(p.name);
    if (p.dob) byNameDob.set(`${n}|${p.dob}`, id);
    byName.set(n, byName.has(n) ? null : id);
  }
  return (name: string, dob: number | null): number | null =>
    (dob ? byNameDob.get(`${normName(name)}|${dob}`) : undefined) ?? byName.get(normName(name)) ?? null;
}

const HANDS = ["R", "L", "A"] as const;

/**
 * Sackmann id (or a synthetic one) for every TML player code, plus player
 * info for the players Sackmann doesn't have.
 */
export function resolveTmlPlayers(tmlPlayers: readonly Row[], sackmann: ReadonlyMap<number, PlayerInfo>) {
  const match = playerMatcher(sackmann);
  const ids = new Map<string, number>();
  const added = new Map<number, PlayerInfo>();
  for (const p of tmlPlayers) {
    const dob = Number(p.birthdate) || null;
    const known = match(p.player, dob);
    if (known !== null) {
      ids.set(p.id, known);
      continue;
    }
    const id = syntheticId(p.id);
    ids.set(p.id, id);
    added.set(id, {
      name: p.player,
      hand: HANDS.find((h) => h === p.hand) ?? "U",
      dob,
      country: p.ioc,
      heightCm: Number(p.height) || null,
    });
  }
  return { ids, added };
}

// ------------------------------------------------------------------ matches

/** Sackmann's code for a tourney id: "2026-0410" and "2026-410" are both "410". */
export const tourneyCode = (tourneyId: string) => tourneyId.split("-").slice(1).join("-").replace(/^0+(?=\d)/, "");

export interface KnownTourney {
  name: string;
  level: string;
}

/** Name and level of every tournament code in Sackmann's rows (latest season wins). */
export function knownTourneys(rows: readonly Row[]): Map<string, KnownTourney> {
  const known = new Map<string, KnownTourney>();
  for (const r of rows) {
    const code = tourneyCode(r.tourney_id);
    if (/^\d+$/.test(code)) known.set(code, { name: r.tourney_name, level: r.tourney_level });
  }
  return known;
}

/** TML writes tour-level events as "250" or "500"; Sackmann uses "A". */
const LEVELS: Record<string, string> = { "250": "A", "500": "A" };

/**
 * Rewrites TML rows into Sackmann's shape: Sackmann player ids, the
 * tournament's start date instead of the match day, and Sackmann's name and
 * level for tournaments it knows (TML calls some events differently and has
 * the odd wrong level). Duplicate matches (the same match in two files) are
 * dropped.
 */
export function normalizeTmlMatches(
  rows: readonly Row[],
  ids: ReadonlyMap<string, number>,
  known: ReadonlyMap<string, KnownTourney>,
): Row[] {
  const start = new Map<string, number>();
  for (const r of rows) {
    const d = Number(r.tourney_date);
    start.set(r.tourney_id, Math.min(start.get(r.tourney_id) ?? Infinity, d));
  }
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    const winner = ids.get(r.winner_id);
    const loser = ids.get(r.loser_id);
    if (winner === undefined || loser === undefined) continue;
    const dedupe = `${r.tourney_id}|${r.round}|${r.winner_id}|${r.loser_id}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const k = known.get(tourneyCode(r.tourney_id));
    out.push({
      ...r,
      tourney_name: k?.name ?? r.tourney_name,
      tourney_level: k?.level ?? LEVELS[r.tourney_level] ?? r.tourney_level,
      tourney_date: String(start.get(r.tourney_id)),
      winner_id: String(winner),
      loser_id: String(loser),
    });
  }
  return out;
}

// ----------------------------------------------------------------- rankings

export interface RankObservation {
  player: number;
  /** The ranking list (Monday) the rank comes from. */
  listDate: number;
  rank: number;
  points: number | null;
}

/**
 * Each player's rank and points at each tournament they played. A
 * tournament's entry ranks come from the list published on the Monday of its
 * first day. `rows` must already be normalized (start dates, Sackmann ids).
 */
export function rankObservations(rows: readonly Row[]): RankObservation[] {
  const out: RankObservation[] = [];
  for (const r of rows) {
    const listDate = mondayOf(Number(r.tourney_date));
    for (const side of ["winner", "loser"] as const) {
      const rank = Number(r[`${side}_rank`]);
      if (!rank) continue;
      out.push({
        player: Number(r[`${side}_id`]),
        listDate,
        rank,
        points: Number(r[`${side}_rank_points`]) || null,
      });
    }
  }
  return out;
}

/**
 * An approximate ranking list for `date`: every player at their most recent
 * known rank, re-numbered 1..n (ties go to the more recent observation).
 * Only used for weeks without a published list.
 */
export function reconstructList(observations: readonly RankObservation[], date: number, size = 500): RankEntry[] {
  const latest = new Map<number, RankObservation>();
  for (const o of observations) {
    if (o.listDate > date) continue;
    const prev = latest.get(o.player);
    if (!prev || o.listDate > prev.listDate) latest.set(o.player, o);
  }
  return [...latest.values()]
    .sort((a, b) => a.rank - b.rank || b.listDate - a.listDate)
    .slice(0, size)
    .map((o, i) => ({ rank: i + 1, player: o.player, points: o.points }));
}

/** Latest known points per player, as of `date`. */
export function latestPoints(observations: readonly RankObservation[], date: number): Map<number, number> {
  const best = new Map<number, RankObservation>();
  for (const o of observations) {
    if (o.listDate > date || o.points === null) continue;
    const prev = best.get(o.player);
    if (!prev || o.listDate > prev.listDate) best.set(o.player, o);
  }
  return new Map([...best].map(([p, o]) => [p, o.points!]));
}

// ---------------------------------------------------- Tennis Abstract lists

export interface PublishedEntry {
  rank: number;
  name: string;
  country: string;
  /** YYYYMMDD, or null if unknown. */
  dob: number | null;
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&#39;": "'", "&apos;": "'", "&quot;": '"' };
const decode = (s: string) => s.replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? e).trim();

/** Parses Tennis Abstract's ATP rankings report (reports/atpRankings.html). */
export function parseTennisAbstractRankings(html: string): { date: number; entries: PublishedEntry[] } {
  const updated = /Last update:\s*(\d{4})-(\d{2})-(\d{2})/.exec(html);
  if (!updated) throw new Error("Tennis Abstract rankings: no 'Last update' date found");
  const entries: PublishedEntry[] = [];
  const row =
    /<tr><td[^>]*>(\d+)<\/td><td[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/td><td[^>]*>([A-Z]{3})?<\/td><td[^>]*>(\d{4}-\d{2}-\d{2})?<\/td><\/tr>/g;
  for (const m of html.matchAll(row)) {
    entries.push({
      rank: Number(m[1]),
      name: decode(m[2]),
      country: m[3] ?? "",
      dob: m[4] ? Number(m[4].replaceAll("-", "")) : null,
    });
  }
  return { date: Number(updated.slice(1).join("")), entries };
}

/**
 * Turns a published list into ranking entries with Sackmann ids. Points come
 * from `points` (TML observations). Throws if a top-100 player can't be
 * matched, since that would silently change the rollable pool.
 */
export function publishedList(
  entries: readonly PublishedEntry[],
  resolve: (e: PublishedEntry) => number | null,
  points: ReadonlyMap<number, number>,
): RankEntry[] {
  const out: RankEntry[] = [];
  const missing: string[] = [];
  for (const e of entries) {
    const player = resolve(e);
    if (player === null) {
      if (e.rank <= 100) missing.push(`#${e.rank} ${e.name}`);
      continue;
    }
    out.push({ rank: e.rank, player, points: points.get(player) ?? null });
  }
  if (missing.length) throw new Error(`Can't identify ranked players: ${missing.join(", ")}`);
  return out;
}
