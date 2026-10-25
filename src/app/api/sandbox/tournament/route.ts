// Sandbox tournament draw. Nothing here is saved.
//
//   GET /api/sandbox/tournament?year=2015&player=104925&tier=500   a 500 draw for that season

import { findSeason } from "@/lib/data/seasons";
import { scoreSeason } from "@/lib/scoring";
import { isTierId } from "@/lib/tournament";
import { drawTournament } from "@/lib/tournament-draw";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const season = findSeason(Number(params.get("year")), Number(params.get("player")));
  if (!season) return Response.json({ error: "Season not found" }, { status: 404 });
  const tier = params.get("tier");
  if (!isTierId(tier)) return Response.json({ error: "Unknown tier" }, { status: 400 });
  return Response.json(drawTournament(season, scoreSeason(season).total, tier));
}
