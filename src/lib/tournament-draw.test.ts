import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { findSeason } from "./data/seasons";
import { scoreSeason } from "./scoring";
import { TIERS } from "./tournament";
import { drawTournament } from "./tournament-draw";

describe("drawTournament", () => {
  const season = findSeason(2008, 104745)!; // Nadal, 2008

  it("fills each tier's draw from its rank range, the player included once", () => {
    for (const tier of TIERS) {
      const setup = drawTournament(season, scoreSeason(season).total, tier.id!);
      expect(setup.tier).toBe(tier.id);
      expect(setup.entrants).toHaveLength(tier.size);
      expect(setup.entrants[setup.you]).toMatchObject({ playerId: 104745, year: 2008 });
      const others = setup.entrants.filter((_, i) => i !== setup.you);
      for (const e of others) {
        expect(e.finalRank).toBeGreaterThanOrEqual(tier.ranks[0]);
        expect(e.finalRank).toBeLessThanOrEqual(tier.ranks[1]);
      }
      expect(new Set(setup.entrants.map((e) => `${e.year}:${e.playerId}`)).size).toBe(tier.size);
    }
  });
});
