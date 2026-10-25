// Choosing a photo for each player-season from a player's Commons files.
// Pure, so it's testable without the network (see photos.ts for the lookup).

import type { Photo } from "../../src/lib/photos-types";

/** A year in a category or file name ("Roger Federer at the 2007 US Open"). */
export function yearIn(text: string): number | null {
  const m = text.match(/(?<!\d)(19[6-9]\d|20[0-3]\d)(?!\d)/);
  return m ? Number(m[1]) : null;
}

/** Lower-case, accents dropped: "Đoković" → "dokovic". */
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

/** Commons credits are HTML; keep the text. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Files that aren't a photo of the player (signatures, logos, statues…). */
const NOT_A_PORTRAIT =
  /signature|autograph|signat|logo|emblem|poster|stamp|coin|statue|wax|mural|graffiti|ticket|scoreboard|draw\b|graph|chart|map\b|caricature|drawing|cartoon|racket\b|shoe/i;

/** Signs a photo was taken at a tennis event, on court. */
const ON_COURT =
  /\bopen\b|wimbledon|roland.garros|french open|us open|australian open|masters|championship|tournament|davis cup|atp|olympic|tennis|court|match|serv(e|ing)|forehand|backhand|volley|smash|rally|practi[cs]e|warm.?up|vs\.?\b|\bv\.? |final|semifinal|quarterfinal|round of/i;

/** Signs it wasn't: awards, red carpets, press rooms, politics. */
const OFF_COURT =
  /award|laureus|gala|red carpet|premiere|press conference|conference|interview|meeting|embassy|president|minister|ceremony at|visit|reception|museum|fashion|launch|signing|backstage|portrait session|headshot|football|soccer|bernabeu|camp nou|golf|basketball|formula|grand prix|skupstina|parliament|assembly|city hall|town hall|paroles|musique|sheet music|romance/i;

/** The good stuff: celebrations, trophies, crowds. */
const COOL =
  /celebrat|fist|vamos|victory|winning|wins\b|won\b|champion|trophy|triumph|jubil|cheer|waving|wave|salut|roar|scream|kiss|joy|ecstatic|bites?\b|lifts?\b|raises?\b/i;

/** More than one person in frame: doubles, teams, two players at the net. */
const CROWDED = /doubles|\bteam\b|\bvs\.?\b|\bversus\b| and | with |&|handshake|group|players\b|ball ?kids?/i;

export interface Traits {
  /** The file is named after the player (photos named after someone else are usually of them). */
  named: boolean;
  onCourt: boolean;
  offCourt: boolean;
  cool: boolean;
  /** Probably not just the player. */
  crowded: boolean;
}

/**
 * What a photo shows, from its file name (`file`) and its description and
 * categories (`about`). Who else is in frame only shows in the file name.
 */
export function photoTraits(file: string, about = "", lastName = ""): Traits {
  const t = fold(`${file} | ${about}`);
  const offCourt = OFF_COURT.test(t);
  return {
    named: lastName !== "" && fold(file).includes(fold(lastName)),
    onCourt: ON_COURT.test(t) && !offCourt,
    offCourt,
    cool: COOL.test(t),
    crowded: CROWDED.test(fold(file)),
  };
}

/** How well a photo crops into the card's window; null if unusable. */
export function photoScore(p: Photo & { mime: string }): number | null {
  if (p.mime !== "image/jpeg" && p.mime !== "image/png") return null;
  if (Math.min(p.width, p.height) < 300) return null;
  if (NOT_A_PORTRAIT.test(fold(p.file))) return null;
  let score = 0;
  // Crops are usually tight on one player, like a card photo.
  if (/\(cropped\)|\bcrop/i.test(p.file)) score += 1;
  // PNGs are more often graphics than photos.
  if (p.mime === "image/png") score -= 2;
  // Card photos are portrait: upright or square photos crop best.
  const ratio = p.height / p.width;
  if (ratio >= 0.9) score += 2;
  else if (ratio >= 0.65) score += 1;
  else score -= 2;
  return score;
}

export interface Candidate extends Photo, Traits {
  /** Crop quality, from photoScore. */
  score: number;
}

/**
 * How good a candidate is for a season, by the priorities: on court first,
 * then taken close to the season, then the coolest (celebrations, trophies),
 * then how well it crops.
 */
export function seasonValue(c: Candidate, year: number): number {
  const gap = c.year === null ? 4 : Math.min(Math.abs(c.year - year), 8);
  return (
    (c.onCourt ? 12 : 0) -
    (c.offCourt ? 8 : 0) -
    2.5 * gap +
    (c.cool ? 4 : 0) -
    (c.crowded ? 3 : 0) +
    (c.named ? 0 : -4) +
    c.score
  );
}

/** Which candidate each season year uses (indices into `candidates`). */
export function pickForSeasons(candidates: readonly Candidate[], years: readonly number[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (candidates.length === 0) return out;
  for (const y of years) {
    let best = 0;
    for (let i = 1; i < candidates.length; i++) {
      if (seasonValue(candidates[i], y) > seasonValue(candidates[best], y)) best = i;
    }
    out[y] = best;
  }
  return out;
}
