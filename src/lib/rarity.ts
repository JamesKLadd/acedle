// How rare a roll is, from the share of all seasons scoring at least as much.

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export const RARITIES: readonly { id: Rarity; label: string; maxTopPercent: number }[] = [
  { id: "mythic", label: "Mythic", maxTopPercent: 0.1 },
  { id: "legendary", label: "Legendary", maxTopPercent: 1 },
  { id: "epic", label: "Epic", maxTopPercent: 5 },
  { id: "rare", label: "Rare", maxTopPercent: 25 },
  { id: "common", label: "Common", maxTopPercent: 100 },
];

export function rarityOf(topPercent: number): (typeof RARITIES)[number] {
  return RARITIES.find((r) => topPercent <= r.maxTopPercent) ?? RARITIES[RARITIES.length - 1];
}

/** Legendary and mythic rolls get the shine and confetti. */
export const isSpecial = (r: Rarity) => r === "legendary" || r === "mythic";

/** Text color class per rarity (tokens in globals.css). */
export const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-common",
  rare: "text-rare",
  epic: "text-epic",
  legendary: "text-legendary",
  mythic: "text-mythic",
};

/** Final-rank tier shown as soon as the player lands. */
export function rankTier(finalRank: number): { label: string; rarity: Rarity } | null {
  if (finalRank === 1) return { label: "World No. 1", rarity: "mythic" };
  if (finalRank <= 3) return { label: "Top 3", rarity: "legendary" };
  if (finalRank <= 10) return { label: "Top 10", rarity: "epic" };
  if (finalRank <= 20) return { label: "Top 20", rarity: "rare" };
  return null;
}
