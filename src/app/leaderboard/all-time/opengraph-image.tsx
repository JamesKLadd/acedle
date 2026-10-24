import { connection } from "next/server";

import { fmtScore } from "@/lib/format";
import { getAllTimeBoard } from "@/lib/leaderboard";
import { OG_SIZE } from "@/lib/og";
import { createAdminClient } from "@/lib/supabase/admin";

import { boardImage } from "../board-image";

export const alt = "The all-time Acedle leaderboard";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The top three accounts by total points. */
export default async function Image() {
  await connection();
  const entries = await getAllTimeBoard(createAdminClient());
  return boardImage({
    title: "All-time leaderboard",
    aside: "Total points",
    rows: entries.map((e) => ({
      rank: e.rank,
      name: e.handle,
      detail: `${e.roll_count} ${e.roll_count === 1 ? "roll" : "rolls"}`,
      value: fmtScore(e.total_score),
    })),
  });
}
