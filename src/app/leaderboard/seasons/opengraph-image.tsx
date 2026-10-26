import { connection } from "next/server";

import { fmtScore } from "@/lib/format";
import { getSeasonBoard, type SeasonBoardEntry } from "@/lib/leaderboard";
import { OG_SIZE } from "@/lib/og";
import { createAdminClient } from "@/lib/supabase/admin";

import { boardImage } from "../board-image";

export const alt = "The best seasons on Acedle";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The top three seasons. */
export default async function Image() {
  await connection();
  const entries: SeasonBoardEntry[] = await getSeasonBoard(createAdminClient()).catch(() => []);
  return boardImage({
    title: "Best seasons",
    aside: "Season mode",
    empty: "No finished seasons yet.",
    rows: entries.map((e) => ({
      rank: e.rank,
      name: e.handle,
      detail: `${e.year} ${e.player_name} · ${fmtScore(e.points)} pts`,
      value: `${e.wins}–${e.losses}`,
    })),
  });
}
