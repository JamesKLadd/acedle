import { connection } from "next/server";

import { fmtScore, fmtShortDay } from "@/lib/format";
import { getRollBoard } from "@/lib/leaderboard";
import { OG_SIZE } from "@/lib/og";
import { utcDay } from "@/lib/roll/daily";
import { createAdminClient } from "@/lib/supabase/admin";

import { boardImage } from "./board-image";

export const alt = "Today's Acedle leaderboard";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Today's top three (the board's public columns only). */
export default async function Image() {
  await connection();
  const day = utcDay();
  const entries = await getRollBoard(createAdminClient(), day, day);
  return boardImage({
    title: "Daily leaderboard",
    aside: `Today · ${fmtShortDay(day)}`,
    rows: entries.map((e) => ({
      rank: e.rank,
      name: e.handle,
      detail: `${e.year} ${e.player_name} · #${e.final_rank}`,
      value: fmtScore(e.score),
    })),
  });
}
