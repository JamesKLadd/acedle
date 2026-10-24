// Downloads the live-season sources (see live.ts): this season's match files
// from Tennis My Life, and the current ranking list from Tennis Abstract,
// which is added to data/live/atp_rankings_live.csv.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { LAST_YEAR } from "../../src/lib/data/years";
import { parseTennisAbstractRankings, type PublishedEntry } from "./live";
import { LIVE_RANKINGS_FILE, LIVE_RAW_DIR, RANKINGS_URL, TML_BASE } from "./paths";

const USER_AGENT = "AcedleDataRefresh/1.0 (non-commercial fan game; github.com/JamesKLadd/acedle)";

/** TML files for the live season; ongoing files hold this week's matches so far. */
export const TML_FILES = [
  `${LAST_YEAR}.csv`,
  "ongoing_tourneys.csv",
  `${LAST_YEAR}_challenger.csv`,
  "challenger_ongoing_tourneys.csv",
  `atp_quali/${LAST_YEAR}_atp_quali.csv`,
  "ATP_Database.csv",
];

/** How many ranks of each published list to keep (the pool only needs the top 100). */
const KEEP_RANKS = 500;

async function download(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

const csvField = (s: string) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);

/** Adds (or replaces) one list in the snapshot file, keeping it sorted by date and rank. */
function saveRankingList(date: number, entries: readonly PublishedEntry[]) {
  const header = "ranking_date,rank,name,country,birthdate";
  const kept = existsSync(LIVE_RANKINGS_FILE)
    ? readFileSync(LIVE_RANKINGS_FILE, "utf8")
        .split("\n")
        .slice(1)
        .filter((l) => l && !l.startsWith(`${date},`))
    : [];
  const added = entries.map((e) => [date, e.rank, csvField(e.name), e.country, e.dob ?? ""].join(","));
  const lines = [...kept, ...added].sort((a, b) => {
    const [da, ra] = a.split(",", 2).map(Number);
    const [db, rb] = b.split(",", 2).map(Number);
    return da - db || ra - rb;
  });
  mkdirSync(dirname(LIVE_RANKINGS_FILE), { recursive: true });
  writeFileSync(LIVE_RANKINGS_FILE, `${[header, ...lines].join("\n")}\n`);
}

export async function fetchLive() {
  mkdirSync(LIVE_RAW_DIR, { recursive: true });
  for (const file of TML_FILES) {
    const text = await download(`${TML_BASE}/${file}`);
    if (!/^(tourney_id|id),/.test(text)) throw new Error(`${file}: not the expected CSV`);
    writeFileSync(join(LIVE_RAW_DIR, basename(file)), text);
    console.log(`  ${file}: ${text.split("\n").length - 2} rows`);
  }

  const { date, entries } = parseTennisAbstractRankings(await download(RANKINGS_URL));
  const top = entries.slice(0, 100).map((e) => e.rank);
  if (top.length < 100 || top.some((r, i) => r !== i + 1)) {
    throw new Error(`Ranking list ${date} looks wrong: expected ranks 1–100 in order`);
  }
  const ageDays = (Date.now() - Date.UTC(date / 10000, ((date / 100) % 100) - 1, date % 100)) / 86_400_000;
  if (ageDays > 14) console.warn(`  Warning: the latest ranking list is from ${date} (${Math.floor(ageDays)} days ago)`);
  saveRankingList(date, entries.slice(0, KEEP_RANKS));
  console.log(`  rankings: list of ${date}, ${Math.min(entries.length, KEEP_RANKS)} players kept`);
}
