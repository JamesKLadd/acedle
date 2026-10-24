// Builds data/seasons/<year>.json (one record per year-end top-100 player)
// from Jeff Sackmann's ATP CSVs. Run `npm run data:fetch` first.
//
//   npm run data:build
//
// ACEDLE_RAW_DIR overrides the folder holding the atp_*.csv files.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

import type {
  FinalRecord,
  PlayerSeason,
  ServeStats,
  SlamResult,
  Surface,
  TitleRecord,
} from "../../src/lib/data/types";
import { FIRST_YEAR, LAST_YEAR, POOL_SIZE } from "../../src/lib/data/years";
import {
  ageAt,
  asSlamRound,
  classifyEvent,
  dayNumber,
  normalizeEntry,
  parseScore,
  roundOrder,
  setWinner,
  slamRoundOrder,
} from "./parse";
import { RAW_DIR, SEASONS_DIR } from "./paths";

type Row = Record<string, string>;

const num = (s: string | undefined): number | null => {
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function readCsv(file: string): Row[] {
  return parse(readFileSync(file, "utf8"), { columns: true, skip_empty_lines: true, relax_column_count: true });
}

// ---------------------------------------------------------------- players

interface PlayerInfo {
  name: string;
  hand: PlayerSeason["hand"];
  dob: number | null;
  country: string;
  heightCm: number | null;
}

function loadPlayers(): Map<number, PlayerInfo> {
  const players = new Map<number, PlayerInfo>();
  for (const r of readCsv(join(RAW_DIR, "atp_players.csv"))) {
    const hand = (["R", "L", "A"] as const).find((h) => h === r.hand) ?? "U";
    const dob = num(r.dob);
    players.set(Number(r.player_id), {
      name: `${r.name_first} ${r.name_last}`.trim(),
      hand,
      // Some DOBs only carry a year (e.g. 19850000); treat those as unknown.
      dob: dob && dob % 10000 !== 0 ? dob : null,
      country: r.ioc,
      heightCm: num(r.height),
    });
  }
  return players;
}

// --------------------------------------------------------------- rankings

interface RankEntry {
  rank: number;
  player: number;
  points: number | null;
}

interface Rankings {
  dates: number[];
  byDate: Map<number, RankEntry[]>;
}

function loadRankings(): Rankings {
  const byDate = new Map<number, RankEntry[]>();
  const files = readdirSync(RAW_DIR).filter((f) => /^atp_rankings_.*\.csv$/.test(f));
  for (const file of files) {
    const lines = readFileSync(join(RAW_DIR, file), "utf8").split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [d, rank, player, points] = line.split(",");
      const date = Number(d);
      let list = byDate.get(date);
      if (!list) byDate.set(date, (list = []));
      list.push({ rank: Number(rank), player: Number(player), points: num(points) });
    }
  }
  for (const list of byDate.values()) list.sort((a, b) => a.rank - b.rank);
  return { dates: [...byDate.keys()].sort((a, b) => a - b), byDate };
}

// ---------------------------------------------------------------- matches

interface MatchRow {
  season: number;
  code: string;
  tourneyId: string;
  name: string;
  category: ReturnType<typeof classifyEvent>;
  surface: Surface | null;
  date: number;
  round: string;
  matchNum: number;
  winner: number;
  loser: number;
  winnerEntry: string;
  winnerRank: number | null;
  loserRank: number | null;
  score: string;
  bestOf: number;
  minutes: number | null;
  raw: Row;
}

const SURFACES: readonly Surface[] = ["Hard", "Clay", "Grass", "Carpet"];

function loadMatches(): MatchRow[] {
  const rows: MatchRow[] = [];
  const files = readdirSync(RAW_DIR).filter((f) => /^atp_matches_\d{4}\.csv$/.test(f));
  for (const file of files) {
    // The file's year is the season; some events start in late December of the prior year.
    const season = Number(file.slice(12, 16));
    for (const r of readCsv(join(RAW_DIR, file))) {
      const category = classifyEvent(r.tourney_level, r.tourney_name);
      if (category === "excluded") continue;
      rows.push({
        season,
        code: r.tourney_id.split("-").slice(1).join("-"),
        tourneyId: r.tourney_id,
        name: r.tourney_name,
        category,
        surface: (SURFACES as readonly string[]).includes(r.surface) ? (r.surface as Surface) : null,
        date: Number(r.tourney_date),
        round: r.round,
        matchNum: Number(r.match_num) || 0,
        winner: Number(r.winner_id),
        loser: Number(r.loser_id),
        winnerEntry: r.winner_entry,
        winnerRank: num(r.winner_rank),
        loserRank: num(r.loser_rank),
        score: r.score,
        bestOf: Number(r.best_of) || 3,
        minutes: num(r.minutes),
        raw: r,
      });
    }
  }
  canonicalizeCodes(rows);
  rows.sort(
    (a, b) =>
      a.season - b.season ||
      a.date - b.date ||
      a.tourneyId.localeCompare(b.tourneyId) ||
      roundOrder(a.round) - roundOrder(b.round) ||
      a.matchNum - b.matchNum,
  );
  return rows;
}

const NAME_FIXES: Record<string, string> = { "Us Open": "US Open" };

/**
 * Tournament codes are zero-padded inconsistently ("421" vs "0421"), and some
 * 2016–2020 events use a different scheme ("M024" for Cincinnati). Map every
 * code to the numeric code its tournament name uses in other seasons.
 */
function canonicalizeCodes(rows: MatchRow[]) {
  const numericByName = new Map<string, Map<string, number>>();
  for (const r of rows) {
    r.name = NAME_FIXES[r.name] ?? r.name;
    if (!/^\d+$/.test(r.code)) continue;
    r.code = r.code.replace(/^0+(?=\d)/, "");
    const counts = numericByName.get(r.name) ?? new Map<string, number>();
    counts.set(r.code, (counts.get(r.code) ?? 0) + 1);
    numericByName.set(r.name, counts);
  }
  for (const r of rows) {
    if (/^\d+$/.test(r.code)) continue;
    const counts = numericByName.get(r.name);
    if (counts) r.code = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
}

// ------------------------------------------------------------------ build

const key = (season: number, player: number) => `${season}:${player}`;

interface Accumulator {
  titles: TitleRecord[];
  finalsLost: FinalRecord[];
  slams: Map<string, SlamResult>;
  wins: number;
  losses: number;
  winsVsTop10: number;
  winsVsNo1: number;
  upsetWins: number;
  fiveSetWins: number;
  comebackWins: number;
  bagels: number;
  tiebreaksWon: number;
  tiebreaksPlayed: number;
  streak: number;
  longestStreak: number;
  longestWinMinutes: number | null;
  serve: ServeStats;
}

function newAccumulator(): Accumulator {
  return {
    titles: [],
    finalsLost: [],
    slams: new Map(),
    wins: 0,
    losses: 0,
    winsVsTop10: 0,
    winsVsNo1: 0,
    upsetWins: 0,
    fiveSetWins: 0,
    comebackWins: 0,
    bagels: 0,
    tiebreaksWon: 0,
    tiebreaksPlayed: 0,
    streak: 0,
    longestStreak: 0,
    longestWinMinutes: null,
    serve: {
      matches: 0,
      aces: 0,
      doubleFaults: 0,
      servePoints: 0,
      serviceGames: 0,
      breakPointsFaced: 0,
      breakPointsSaved: 0,
    },
  };
}

function addServe(acc: Accumulator, r: Row, side: "w" | "l") {
  const svpt = num(r[`${side}_svpt`]);
  if (svpt === null || svpt === 0) return;
  acc.serve.matches++;
  acc.serve.aces += num(r[`${side}_ace`]) ?? 0;
  acc.serve.doubleFaults += num(r[`${side}_df`]) ?? 0;
  acc.serve.servePoints += svpt;
  acc.serve.serviceGames += num(r[`${side}_SvGms`]) ?? 0;
  acc.serve.breakPointsFaced += num(r[`${side}_bpFaced`]) ?? 0;
  acc.serve.breakPointsSaved += num(r[`${side}_bpSaved`]) ?? 0;
}

function main() {
  console.log(`Reading raw data from ${RAW_DIR}`);
  const players = loadPlayers();
  const rankings = loadRankings();
  const matches = loadMatches();
  console.log(`  ${players.size} players, ${rankings.dates.length} ranking dates, ${matches.length} matches`);

  const lastRankingDate = rankings.dates[rankings.dates.length - 1];
  const liveYear = lastRankingDate % 10000 < 1200 ? Math.floor(lastRankingDate / 10000) : null;

  // Final ranking list of every season (used for career "first top-N finish" checks too).
  const finalDateOf = new Map<number, number>();
  const firstDateOf = new Map<number, number>();
  for (const d of rankings.dates) {
    const y = Math.floor(d / 10000);
    finalDateOf.set(y, d);
    if (!firstDateOf.has(y)) firstDateOf.set(y, d);
  }

  // Best year-end rank achieved before each season, per player.
  const bestFinishBefore = new Map<string, number>();
  {
    const best = new Map<number, number>();
    for (const y of [...finalDateOf.keys()].sort((a, b) => a - b)) {
      for (const e of rankings.byDate.get(finalDateOf.get(y)!)!) {
        const prev = best.get(e.player);
        if (prev !== undefined) bestFinishBefore.set(key(y, e.player), prev);
      }
      for (const e of rankings.byDate.get(finalDateOf.get(y)!)!) {
        best.set(e.player, Math.min(best.get(e.player) ?? Infinity, e.rank));
      }
    }
  }

  // Peak rank per season and days at #1 per season.
  const peak = new Map<string, number>();
  const daysAtNo1 = new Map<string, number>();
  for (let i = 0; i < rankings.dates.length; i++) {
    const d = rankings.dates[i];
    const y = Math.floor(d / 10000);
    const list = rankings.byDate.get(d)!;
    if (y >= FIRST_YEAR) {
      for (const e of list) {
        const k = key(y, e.player);
        peak.set(k, Math.min(peak.get(k) ?? Infinity, e.rank));
      }
    }
    // The #1 holds the top spot until the next published list.
    const no1 = list[0];
    if (!no1 || no1.rank !== 1) continue;
    const start = dayNumber(d);
    const end = i + 1 < rankings.dates.length ? dayNumber(rankings.dates[i + 1]) : start + 7;
    for (let day = start; day < end; day++) {
      const year = new Date(day * 86_400_000).getUTCFullYear();
      if (year < FIRST_YEAR) continue;
      const k = key(year, no1.player);
      daysAtNo1.set(k, (daysAtNo1.get(k) ?? 0) + 1);
    }
  }

  // Which player-seasons we need: the final top 100 of each rollable season.
  const pool = new Map<number, RankEntry[]>();
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    const d = finalDateOf.get(y);
    if (!d) throw new Error(`No ranking data for ${y}`);
    const top = rankings.byDate.get(d)!.filter((e) => e.rank <= POOL_SIZE).slice(0, POOL_SIZE);
    if (top.length !== POOL_SIZE) console.warn(`  ${y}: only ${top.length} players ranked <= ${POOL_SIZE}`);
    pool.set(y, top);
  }
  const needed = new Set<string>();
  for (const [y, top] of pool) for (const e of top) needed.add(key(y, e.player));

  // Career titles (all seasons, for maiden/defended checks) and per-season stats.
  const firstTitleSeason = new Map<number, number>();
  const titleCodes = new Map<string, Set<string>>();
  const acc = new Map<string, Accumulator>();
  const get = (k: string) => {
    let a = acc.get(k);
    if (!a) acc.set(k, (a = newAccumulator()));
    return a;
  };

  for (const m of matches) {
    const isTitleEvent = m.category !== "team";
    if (isTitleEvent && m.round === "F") {
      const prev = firstTitleSeason.get(m.winner);
      if (prev === undefined || m.season < prev) firstTitleSeason.set(m.winner, m.season);
      const k = key(m.season, m.winner);
      if (!titleCodes.has(k)) titleCodes.set(k, new Set());
      titleCodes.get(k)!.add(m.code);
    }
    if (m.season < FIRST_YEAR) continue;

    const wk = key(m.season, m.winner);
    const lk = key(m.season, m.loser);
    const wanted = { w: needed.has(wk), l: needed.has(lk) };
    if (!wanted.w && !wanted.l) continue;

    const category = m.category === "team" ? null : m.category;
    if (category === "slam") {
      const reached = asSlamRound(m.round);
      if (reached) {
        for (const [side, k] of [["w", wk], ["l", lk]] as const) {
          if (!wanted[side]) continue;
          const round = side === "w" && m.round === "F" ? "W" : reached;
          const a = get(k);
          const prev = a.slams.get(m.code);
          if (!prev || slamRoundOrder(round) > slamRoundOrder(prev.round)) {
            a.slams.set(m.code, { code: m.code, name: m.name, round });
          }
        }
      }
    }

    if (category && m.round === "F") {
      if (wanted.w) {
        get(wk).titles.push({
          code: m.code,
          name: m.name,
          category,
          surface: m.surface,
          date: m.date,
          entry: normalizeEntry(m.winnerEntry),
        });
      }
      if (wanted.l) get(lk).finalsLost.push({ code: m.code, name: m.name, category });
    }

    const score = parseScore(m.score);
    if (score.walkover) continue;

    if (wanted.w) {
      const a = get(wk);
      a.wins++;
      a.streak++;
      a.longestStreak = Math.max(a.longestStreak, a.streak);
      if (m.loserRank !== null && m.loserRank <= 10) a.winsVsTop10++;
      if (m.loserRank === 1) a.winsVsNo1++;
      if (m.winnerRank !== null && m.loserRank !== null && m.winnerRank - m.loserRank >= 50) a.upsetWins++;
      if (!score.incomplete && score.sets.length === 5) a.fiveSetWins++;
      if (
        !score.incomplete &&
        score.sets.length >= 4 &&
        setWinner(score.sets[0]) === "l" &&
        setWinner(score.sets[1]) === "l"
      ) {
        a.comebackWins++;
      }
      if (m.minutes !== null && m.minutes > 0 && m.minutes < 720) {
        a.longestWinMinutes = Math.max(a.longestWinMinutes ?? 0, m.minutes);
      }
      addServe(a, m.raw, "w");
    }
    if (wanted.l) {
      const a = get(lk);
      a.losses++;
      a.streak = 0;
      addServe(a, m.raw, "l");
    }

    score.sets.forEach((set, i) => {
      const won = setWinner(set);
      for (const [side, k] of [["w", wk], ["l", lk]] as const) {
        if (!wanted[side]) continue;
        const a = get(k);
        const mine = side === "w" ? set[0] : set[1];
        const theirs = side === "w" ? set[1] : set[0];
        if (mine === 6 && theirs === 0) a.bagels++;
        if (score.tiebreak[i] && won) {
          a.tiebreaksPlayed++;
          if (won === side) a.tiebreaksWon++;
        }
      }
    });
  }

  // Assemble records.
  mkdirSync(SEASONS_DIR, { recursive: true });
  let total = 0;
  for (const [y, top] of pool) {
    const live = y === liveYear;
    const dataAsOf = finalDateOf.get(y)!;
    const finalList = rankings.byDate.get(dataAsOf)!;
    // Some final lists of a year were published without points; use the latest list that has them.
    const pointsDate = rankings.dates.findLast(
      (d) => Math.floor(d / 10000) === y && rankings.byDate.get(d)![0]?.points != null,
    );
    const pointsList = pointsDate ? rankings.byDate.get(pointsDate)! : [];
    const pointsOf = new Map(pointsList.map((p) => [p.player, p.points]));
    const no1Points = pointsList[0]?.points ?? null;
    const firstList = rankings.byDate.get(firstDateOf.get(y)!)!;
    const startRank = new Map(firstList.map((e) => [e.player, e.rank]));
    const refDate = live ? dataAsOf : y * 10000 + 1231;

    const countryRank = new Map<number, number>();
    const seenCountries = new Map<string, number>();
    for (const e of finalList) {
      const c = players.get(e.player)?.country ?? "UNK";
      const n = (seenCountries.get(c) ?? 0) + 1;
      seenCountries.set(c, n);
      countryRank.set(e.player, n);
    }

    const records: PlayerSeason[] = top.map((e) => {
      const info = players.get(e.player);
      if (!info) throw new Error(`Unknown player ${e.player} in ${y} rankings`);
      const k = key(y, e.player);
      const a = acc.get(k) ?? newAccumulator();
      const prevBest = bestFinishBefore.get(k);
      const prevTitles = titleCodes.get(key(y - 1, e.player)) ?? new Set<string>();
      const defended = [...new Set(a.titles.map((t) => t.code))].filter((c) => prevTitles.has(c));
      return {
        year: y,
        playerId: e.player,
        name: info.name,
        country: info.country,
        hand: info.hand,
        heightCm: info.heightCm,
        age: info.dob ? ageAt(info.dob, refDate) : null,
        live,
        dataAsOf,
        ranking: {
          final: e.rank,
          finalPoints: e.points ?? pointsOf.get(e.player) ?? null,
          no1Points,
          peak: Math.min(peak.get(k) ?? e.rank, e.rank),
          start: startRank.get(e.player) ?? null,
          weeksAtNo1: Math.round((daysAtNo1.get(k) ?? 0) / 7),
          firstTop10Finish: e.rank <= 10 && !(prevBest !== undefined && prevBest <= 10),
          firstTop100Finish: !(prevBest !== undefined && prevBest <= 100),
          countryRank: countryRank.get(e.player) ?? 1,
        },
        titles: a.titles,
        finalsLost: a.finalsLost,
        slams: [...a.slams.values()],
        maidenTitle: a.titles.length > 0 && firstTitleSeason.get(e.player) === y,
        defendedTitles: defended,
        matches: {
          wins: a.wins,
          losses: a.losses,
          winsVsTop10: a.winsVsTop10,
          winsVsNo1: a.winsVsNo1,
          upsetWins: a.upsetWins,
          fiveSetWins: a.fiveSetWins,
          comebackWins: a.comebackWins,
          bagels: a.bagels,
          tiebreaksWon: a.tiebreaksWon,
          tiebreaksPlayed: a.tiebreaksPlayed,
          longestStreak: a.longestStreak,
          longestWinMinutes: a.longestWinMinutes,
        },
        serve: a.serve.matches > 0 ? a.serve : null,
      };
    });

    // One record per line keeps diffs readable when the data is rebuilt.
    const body = `[\n${records.map((r) => JSON.stringify(r)).join(",\n")}\n]\n`;
    writeFileSync(join(SEASONS_DIR, `${y}.json`), body);
    total += records.length;
  }

  writeFileSync(
    join(SEASONS_DIR, "meta.json"),
    `${JSON.stringify({ firstYear: FIRST_YEAR, lastYear: LAST_YEAR, liveYear, dataAsOf: lastRankingDate }, null, 2)}\n`,
  );
  console.log(`Wrote ${total} player-seasons to ${SEASONS_DIR} (live season: ${liveYear ?? "none"})`);
}

main();
