// Shape of one player-season record. Produced by scripts/etl/build.ts and
// consumed by the scoring engine. Keep this file dependency-free so it can be
// shared by the ETL, the engine, and the app.

export type Surface = "Hard" | "Clay" | "Grass" | "Carpet";

/** Tournament category after classification of the raw tourney_level. */
export type EventCategory = "slam" | "masters" | "finals" | "olympics" | "tour";

export type EntryType = "Q" | "WC" | "LL" | "PR" | "SE" | "ALT" | null;

export interface TitleRecord {
  /** Stable tournament code, e.g. "520" (Roland Garros), "0404" (Indian Wells). */
  code: string;
  name: string;
  category: EventCategory;
  surface: Surface | null;
  /** Tournament start date, YYYYMMDD. */
  date: number;
  entry: EntryType;
}

export interface FinalRecord {
  code: string;
  name: string;
  category: EventCategory;
}

/** Furthest round reached at one Grand Slam. "W" = champion. */
export type SlamRound = "W" | "F" | "SF" | "QF" | "R16" | "R32" | "R64" | "R128";

export interface SlamResult {
  code: string;
  name: string;
  round: SlamRound;
}

export interface ServeStats {
  /** Matches that had serve stats recorded (1991+). */
  matches: number;
  aces: number;
  doubleFaults: number;
  servePoints: number;
  serviceGames: number;
  breakPointsFaced: number;
  breakPointsSaved: number;
}

export interface PlayerSeason {
  year: number;
  playerId: number;
  name: string;
  /** IOC country code. */
  country: string;
  hand: "R" | "L" | "U" | "A";
  heightCm: number | null;
  /** Age in whole years at the season's reference date (Dec 31, or dataAsOf when live). */
  age: number | null;
  /** True for the in-progress season (stats are year-to-date). */
  live: boolean;
  /** Ranking date the season was built from, YYYYMMDD. */
  dataAsOf: number;

  ranking: {
    /** Year-end rank (or current rank when live). */
    final: number;
    finalPoints: number | null;
    /** Points of the #1 player on the same ranking date. */
    no1Points: number | null;
    /** Best rank held during the season. */
    peak: number;
    /** Rank on the first ranking list of the season; null if unranked. */
    start: number | null;
    weeksAtNo1: number;
    /** No earlier season ended inside the top 10 / top 100. */
    firstTop10Finish: boolean;
    firstTop100Finish: boolean;
    /** 1 = best-ranked player from his country on the final ranking list. */
    countryRank: number;
  };

  titles: TitleRecord[];
  finalsLost: FinalRecord[];
  slams: SlamResult[];
  /** First career tour-level title came this season. */
  maidenTitle: boolean;
  /** Codes of titles also won the previous season. */
  defendedTitles: string[];

  matches: {
    wins: number;
    losses: number;
    winsVsTop10: number;
    winsVsNo1: number;
    /** Wins over an opponent ranked 50+ places higher. */
    upsetWins: number;
    fiveSetWins: number;
    /** Wins after losing the first two sets. */
    comebackWins: number;
    /** Sets won 6-0. */
    bagels: number;
    tiebreaksWon: number;
    tiebreaksPlayed: number;
    /** Longest winning streak inside the season. */
    longestStreak: number;
    /** Longest match won, in minutes (null if no durations recorded). */
    longestWinMinutes: number | null;
  };

  serve: ServeStats | null;
}
