// Sandbox tournament draw. Nothing here is saved.
//
//   GET /api/sandbox/tournament?year=2015&player=104925   a draw for that season

import { findSeason } from "@/lib/data/seasons";
import { scoreSeason } from "@/lib/scoring";
import { drawTournament } from "@/lib/tournament-draw";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const season = findSeason(Number(params.get("year")), Number(params.get("player")));
  if (!season) return Response.json({ error: "Season not found" }, { status: 404 });
  return Response.json(drawTournament(season, scoreSeason(season).total));
}
