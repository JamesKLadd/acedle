// Finds a photo for every rollable player-season on Wikimedia Commons and
// writes data/photos.json (npm run data:photos). Re-run after new seasons.
//
// For each player: their Commons category comes from Wikidata (P373; the
// Sackmann player list has Wikidata ids). Year categories under it ("Roger
// Federer in 2007", "Roger Federer at the 2007 US Open") give dated photos;
// the category's own files are dated from their metadata. Each season then
// gets a photo from that year, else the nearest year, else an undated one,
// else the player's main Wikidata image (P18). Players with none get the
// app's default card art. Every photo keeps its author and license, which
// the card shows (Commons licenses require credit).
//
// Wikimedia rate-limits busy networks hard; .github/workflows/photos.yml runs
// this on GitHub. ACEDLE_PHOTO_QUICK=1 only looks up each player's main
// Wikidata image (a few dozen requests), for a quick first pass.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

import type { PlayerSeason } from "../../src/lib/data/types";
import type { Photo, PhotosFile } from "../../src/lib/photos-types";
import { fold, photoScore, photoTraits, pickForSeasons, plainText, yearIn, type Candidate } from "./photo-pick";
import { RAW_DIR, ROOT, SEASONS_DIR } from "./paths";

const OUT = join(ROOT, "data/photos.json");
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = "AcedlePhotos/1.0 (non-commercial fan game; github.com/JamesKLadd/acedle)";
const THUMB_WIDTH = 500;
/** Wikimedia asks bots to make one request at a time; the pause keeps under its rate limit. */
const CONCURRENCY = 1;
const PAUSE_MS = Number(process.env.ACEDLE_PHOTO_PAUSE_MS ?? 1000);
/** Subcategory titles worth opening that carry no year themselves. */
const CONTAINER = /\bby (year|tournament|event|season|decade|competition)\b|\b(19|20)\d0s\b/i;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(base: string, params: Record<string, string>, attempt = 0): Promise<Json> {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
  await sleep(PAUSE_MS);
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } }).catch(() => null);
  const body = res?.ok ? ((await res.json()) as Json) : null;
  if (!body || body.error?.code === "maxlag") {
    if (attempt >= 8) throw new Error(`${url}: ${res?.status ?? "network error"} ${body?.error?.code ?? ""}`);
    // Rate limited (429) or lagged: wait as long as asked, else back off.
    const asked = Number(res?.headers.get("retry-after"));
    await sleep(Number.isFinite(asked) && asked > 0 ? asked * 1000 + 500 : 2000 * 2 ** attempt);
    return api(base, params, attempt + 1);
  }
  return body;
}

async function pool<T>(items: readonly T[], work: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        await work(items[i], i);
      }
    }),
  );
}

// ---------------------------------------------------------------- inputs

interface Player {
  id: number;
  name: string;
  lastName: string;
  years: number[];
  wikidata: string | null;
}

function loadPlayers(): Player[] {
  const seasons = new Map<number, { name: string; years: number[] }>();
  for (const f of readdirSync(SEASONS_DIR).filter((f) => /^\d{4}\.json$/.test(f))) {
    for (const s of JSON.parse(readFileSync(join(SEASONS_DIR, f), "utf8")) as PlayerSeason[]) {
      const p = seasons.get(s.playerId) ?? { name: s.name, years: [] };
      p.years.push(s.year);
      seasons.set(s.playerId, p);
    }
  }
  const rows = parse(readFileSync(join(RAW_DIR, "atp_players.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];
  const info = new Map(rows.map((r) => [Number(r.player_id), r]));
  return [...seasons].map(([id, s]) => ({
    id,
    name: s.name,
    lastName: info.get(id)?.name_last || s.name.split(" ").at(-1)!,
    years: s.years.sort(),
    wikidata: info.get(id)?.wikidata_id || null,
  }));
}

/**
 * Commons category (P373) and main image (P18) for each Wikidata id, in one
 * SPARQL query (the entity API rate-limits batch lookups hard).
 */
async function wikidataClaims(ids: string[]) {
  const query = `SELECT ?item ?cat ?img WHERE {
    VALUES ?item { ${ids.map((id) => `wd:${id}`).join(" ")} }
    OPTIONAL { ?item wdt:P373 ?cat } OPTIONAL { ?item wdt:P18 ?img }
  }`;
  const res = await fetch(SPARQL, {
    method: "POST",
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/sparql-results+json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`Wikidata query: HTTP ${res.status}`);
  const body = (await res.json()) as Json;
  const out = new Map<string, { category: string | null; image: string | null }>();
  for (const b of body.results.bindings as Json[]) {
    const id = String(b.item.value).split("/").pop()!;
    const prev = out.get(id);
    // P18 comes as a Special:FilePath URL; keep the file name.
    const image = b.img ? decodeURIComponent(String(b.img.value).split("/").pop()!) : null;
    out.set(id, { category: prev?.category ?? b.cat?.value ?? null, image: prev?.image ?? image });
  }
  return out;
}

// ---------------------------------------------------------------- Commons

const IMAGE_PROPS = {
  prop: "imageinfo",
  iiprop: "url|size|mime|extmetadata",
  iiurlwidth: String(THUMB_WIDTH),
  iiextmetadatafilter: "DateTimeOriginal|Artist|Credit|LicenseShortName|LicenseUrl|ImageDescription|ObjectName|Categories",
};

/**
 * A file as a candidate. `year` (from the category it was found in) wins;
 * else the date it was taken, else a year in one of the player's categories
 * or in the file name. `context` (the category it came from) and the file's
 * own description and categories tell on-court and celebration photos apart.
 */
function toCandidate(page: Json, year: number | null, lastName: string, context = ""): Candidate | null {
  const ii = page.imageinfo?.[0];
  if (!ii?.thumburl) return null;
  const meta = ii.extmetadata ?? {};
  const file = String(page.title).replace(/^File:/, "");
  const categories = String(meta.Categories?.value ?? "").split("|");
  const own = fold(lastName);
  const categoryYear = categories.filter((c) => fold(c).includes(own)).map(yearIn).find((y) => y !== null) ?? null;
  const about = [
    context,
    plainText(meta.ImageDescription?.value ?? ""),
    plainText(meta.ObjectName?.value ?? ""),
    ...categories,
  ].join(" | ");
  const photo: Photo = {
    file,
    year: year ?? yearIn(plainText(meta.DateTimeOriginal?.value ?? "")) ?? categoryYear ?? yearIn(file),
    thumb: ii.thumburl,
    width: ii.width,
    height: ii.height,
    author: plainText(meta.Artist?.value ?? meta.Credit?.value ?? "") || "Unknown",
    license: plainText(meta.LicenseShortName?.value ?? "") || "See Commons",
    licenseUrl: meta.LicenseUrl?.value ?? null,
  };
  const score = photoScore({ ...photo, mime: ii.mime }, lastName);
  return score === null ? null : { ...photo, score, ...photoTraits(file, about) };
}

/** A category's subcategories and files (with image info), in as few requests as possible. */
async function members(category: string, pages = 1): Promise<{ subcats: string[]; files: Json[] }> {
  const subcats: string[] = [];
  const files: Json[] = [];
  let cont: Record<string, string> = {};
  for (let i = 0; i < pages; i++) {
    const body = await api(COMMONS, {
      action: "query",
      generator: "categorymembers",
      gcmtitle: `Category:${category}`,
      gcmtype: "subcat|file",
      gcmlimit: "50",
      ...IMAGE_PROPS,
      ...cont,
    });
    for (const page of (body.query?.pages ?? []) as Json[]) {
      if (page.ns === 14) subcats.push(String(page.title).replace(/^Category:/, ""));
      else if (page.ns === 6) files.push(page);
    }
    if (!body.continue) break;
    cont = body.continue;
  }
  return { subcats, files };
}

/** Image info for many files, 50 per request; keyed by file name as given. */
async function fileInfos(files: string[]): Promise<Map<string, Json>> {
  const out = new Map<string, Json>();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const body = await api(COMMONS, { action: "query", titles: batch.map((f) => `File:${f}`).join("|"), ...IMAGE_PROPS });
    // Titles come back normalized (e.g. underscores to spaces).
    const asked = new Map<string, string>(batch.map((f) => [`File:${f}`, f]));
    for (const n of (body.query?.normalized ?? []) as Json[]) asked.set(n.to, asked.get(n.from) ?? n.from);
    for (const page of (body.query?.pages ?? []) as Json[]) {
      const file = asked.get(page.title);
      if (file) out.set(file, page);
    }
  }
  return out;
}

/**
 * Photo candidates for one player: files in their year categories (only the
 * years they have a season in), and the main category's own files.
 */
async function candidatesFor(p: Player, category: string): Promise<Candidate[]> {
  const last = fold(p.lastName);
  const seasons = new Set(p.years);
  const found: Candidate[] = [];
  const add = (pages: Json[], year: number | null, context = "") => {
    for (const page of pages) {
      const c = toCandidate(page, year, p.lastName, context);
      if (c && !found.some((f) => f.file === c.file)) found.push(c);
    }
  };

  const main = await members(category, 2);
  add(main.files, null);
  // Year categories, found under the main one or its "by year" style containers.
  const yearCats = new Map<string, number>();
  const sort = (subs: string[]) => {
    const containers: string[] = [];
    for (const sub of subs) {
      // Only the player's own categories (not family, coaches, events).
      if (!fold(sub).includes(last)) continue;
      const y = yearIn(sub);
      if (y !== null) {
        if (seasons.has(y) && !yearCats.has(sub)) yearCats.set(sub, y);
      } else if (CONTAINER.test(sub)) containers.push(sub);
    }
    return containers;
  };
  for (const container of sort(main.subcats)) {
    for (const inner of sort((await members(container)).subcats)) sort((await members(inner)).subcats);
  }

  // One category per season year is enough; open a subcategory if it has no photos itself.
  const done = new Set<number>();
  for (const [cat, y] of yearCats) {
    if (done.has(y)) continue;
    const m = await members(cat);
    const before = found.length;
    add(m.files, y, cat);
    if (found.length === before) {
      const sub = m.subcats.find((s) => yearIn(s) === y && fold(s).includes(last));
      if (sub) add((await members(sub)).files, y, sub);
    }
    if (found.length > before) done.add(y);
  }

  // The coolest shots: celebrations, fist pumps, trophies. Search finds them
  // across all of Commons; keep the ones that name the player.
  const search = await api(COMMONS, {
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "40",
    gsrsearch: `"${p.name}" filetype:bitmap (celebrating OR celebrates OR celebration OR fist OR vamos OR victory OR trophy OR champion)`,
    ...IMAGE_PROPS,
  });
  const mentions = (page: Json) => {
    const meta = page.imageinfo?.[0]?.extmetadata ?? {};
    const text = [page.title, meta.Categories?.value, plainText(meta.ImageDescription?.value ?? "")].join(" ");
    return fold(text).includes(last);
  };
  add(((search.query?.pages ?? []) as Json[]).filter(mentions), null);
  return found;
}

// ---------------------------------------------------------------- main

/** Days after which a player's photos are looked up again. */
const FRESH_DAYS = Number(process.env.ACEDLE_PHOTO_FRESH_DAYS ?? 25);

async function main() {
  // ACEDLE_PHOTO_PLAYERS=103819,104745 tries a few players and prints instead of writing.
  const only = process.env.ACEDLE_PHOTO_PLAYERS?.split(",").map(Number);
  const quick = process.env.ACEDLE_PHOTO_QUICK === "1";
  const today = new Date().toISOString().slice(0, 10);

  // Incremental: start from the current file and look up the players checked
  // longest ago (or never) first, saving as it goes, so a run that's cut
  // short keeps its work and the next one carries on.
  const out: PhotosFile =
    !only && !quick && existsSync(OUT)
      ? (JSON.parse(readFileSync(OUT, "utf8")) as PhotosFile)
      : { fetched: today, players: {} };
  out.checked ??= {};
  const checked = out.checked;
  const stale = (id: number) => {
    const at = checked[id];
    return !at || Date.now() - Date.parse(at) > FRESH_DAYS * 86_400_000;
  };
  const players = loadPlayers()
    .filter((p) => (only ? only.includes(p.id) : quick || stale(p.id)))
    .sort((a, b) => (checked[a.id] ?? "").localeCompare(checked[b.id] ?? ""));
  console.log(`${players.length} players to look up, ${players.filter((p) => p.wikidata).length} with Wikidata ids`);
  const claims = await wikidataClaims(players.flatMap((p) => (p.wikidata ? [p.wikidata] : [])));
  // Main images (P18) are looked up together up front.
  const mainImages = await fileInfos([
    ...new Set(players.flatMap((p) => (p.wikidata && claims.get(p.wikidata)?.image) || [])),
  ]);

  const save = () => {
    if (only) return;
    // Stable output: players by id.
    const sorted = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => Number(a) - Number(b)));
    writeFileSync(OUT, JSON.stringify({ ...out, fetched: today, players: sorted(out.players), checked: sorted(checked) }) + "\n");
  };

  let done = 0;
  const started = Date.now();
  const stats = { players: 0, seasons: 0, sameSeason: 0 };
  await pool(players, async (p) => {
    const claim = p.wikidata ? claims.get(p.wikidata) : undefined;
    let candidates: Candidate[] = [];
    let ok = true;
    try {
      if (claim?.category && !quick) candidates = await candidatesFor(p, claim.category);
      // The main Wikidata image is always in the running too.
      const page = claim?.image ? mainImages.get(claim.image) : undefined;
      const main = page && toCandidate(page, null, p.lastName);
      if (main && !candidates.some((c) => c.file === main.file)) candidates.push(main);
    } catch (e) {
      ok = false;
      console.warn(`  ${p.name}: ${e instanceof Error ? e.message : e}`);
    }
    const seasons = pickForSeasons(candidates, p.years);
    const used = [...new Set(Object.values(seasons))].sort((a, b) => a - b);
    if (used.length > 0) {
      const photos = used.map((i) => {
        const { file, year, thumb, width, height, author, license, licenseUrl } = candidates[i];
        return { file, year, thumb, width, height, author, license, licenseUrl };
      });
      out.players[p.id] = {
        photos,
        seasons: Object.fromEntries(Object.entries(seasons).map(([y, i]) => [y, used.indexOf(i)])),
      };
      stats.players++;
      stats.seasons += Object.keys(seasons).length;
      stats.sameSeason += Object.entries(seasons).filter(([y, i]) => candidates[i].year === Number(y)).length;
    } else if (ok) {
      delete out.players[p.id];
    }
    // A failed lookup keeps the player's old photos and is retried next run.
    if (ok && !quick) checked[p.id] = today;
    if (++done % 10 === 0) {
      save();
      const min = ((Date.now() - started) / 60000).toFixed(1);
      console.log(`  ${done}/${players.length} (${stats.players} with photos, ${min} min)`);
    }
  });

  save();
  if (only) console.log(JSON.stringify(out.players, null, 1));
  const totalSeasons = players.reduce((n, p) => n + p.years.length, 0);
  console.log(
    `Photos for ${stats.players}/${players.length} players, ${stats.seasons}/${totalSeasons} seasons ` +
      `(${stats.sameSeason} from the same season) → ${OUT}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
