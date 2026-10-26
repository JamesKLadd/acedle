// Sandbox practice season: a season draw for a card, kept by the browser.
// Nothing here is saved.
//
//   GET /api/sandbox/season?year=2015&player=104925   a season for that card

import { findSeason } from "@/lib/data/seasons";
import { scoreSeason } from "@/lib/scoring";
import { drawSeason } from "@/lib/season/draw";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const season = findSeason(Number(params.get("year")), Number(params.get("player")));
  if (!season) return Response.json({ error: "Season not found" }, { status: 404 });
  return Response.json(drawSeason(season, scoreSeason(season).total));
}
