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
  /signature|autograph|signat|logo|emblem|poster|stamp|coin|statue|wax|mural|graffiti|ticket|scoreboard|draw\b|graph|chart|map\b|caricature|drawing|cartoon|trophy\b|racket\b|shoe/i;

/** How good a candidate is as a card photo; null if unusable. */
export function photoScore(p: Photo & { mime: string }, lastName: string): number | null {
  if (p.mime !== "image/jpeg") return null;
  if (Math.min(p.width, p.height) < 300) return null;
  if (NOT_A_PORTRAIT.test(fold(p.file))) return null;
  let score = 0;
  if (fold(p.file).includes(fold(lastName))) score += 3;
  // Card photos are portrait: upright or square photos crop best.
  const ratio = p.height / p.width;
  if (ratio >= 0.9) score += 2;
  else if (ratio >= 0.65) score += 1;
  else score -= 2;
  return score;
}

export interface Candidate extends Photo {
  score: number;
}

/**
 * Which candidate each season year uses: a photo from that year if there is
 * one, else the nearest year's, else the best undated one. Candidates are
 * best first within a year. Returns indices into `candidates`.
 */
export function pickForSeasons(candidates: readonly Candidate[], years: readonly number[]): Record<string, number> {
  const best = (list: number[]) =>
    list.sort((a, b) => candidates[b].score - candidates[a].score || a - b)[0];
  const dated = candidates.map((c, i) => i).filter((i) => candidates[i].year !== null);
  const undated = candidates.map((c, i) => i).filter((i) => candidates[i].year === null);
  const out: Record<string, number> = {};
  for (const y of years) {
    if (dated.length > 0) {
      const gap = Math.min(...dated.map((i) => Math.abs(candidates[i].year! - y)));
      // An undated photo beats a much older or younger one.
      if (gap <= 3 || undated.length === 0) {
        out[y] = best(dated.filter((i) => Math.abs(candidates[i].year! - y) === gap));
        continue;
      }
    }
    if (undated.length > 0) out[y] = best([...undated]);
  }
  return out;
}
