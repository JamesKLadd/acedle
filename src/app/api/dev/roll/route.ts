// Development / sandbox roll endpoint. Nothing here is saved.
//
//   GET /api/dev/roll?luck=1..10        random roll
//   GET /api/dev/roll?year=2015&player=104925   score a specific season

import { findSeason, loadSeasons } from "@/lib/data/seasons";
import type { PlayerSeason } from "@/lib/data/types";
import { rollSeason } from "@/lib/roll";
import { scoreSeason, type ScoreResult } from "@/lib/scoring";

export interface DevRollResponse {
  season: PlayerSeason;
  score: ScoreResult;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const year = Number(params.get("year"));
  const player = Number(params.get("player"));

  const season =
    year && player ? findSeason(year, player) : rollSeason(loadSeasons(), { luck: Number(params.get("luck")) || 1 });
  if (!season) return Response.json({ error: "Season not found" }, { status: 404 });

  return Response.json({ season, score: scoreSeason(season) } satisfies DevRollResponse);
}
