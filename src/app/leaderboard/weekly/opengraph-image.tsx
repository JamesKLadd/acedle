import { connection } from "next/server";

import { fmtScore, fmtShortDay } from "@/lib/format";
import { getRollBoard } from "@/lib/leaderboard";
import { OG_SIZE } from "@/lib/og";
import { addDays, utcDay, weekOf } from "@/lib/roll/daily";
import { createAdminClient } from "@/lib/supabase/admin";

import { boardImage } from "../board-image";

export const alt = "This week's Acedle leaderboard";
export const size = OG_SIZE;
export const contentType = "image/png";

/** This week's top three rolls. */
export default async function Image() {
  await connection();
  const monday = weekOf(utcDay());
  const entries = await getRollBoard(createAdminClient(), monday, addDays(monday, 6));
  return boardImage({
    title: "Weekly leaderboard",
    aside: `Week of ${fmtShortDay(monday)}`,
    rows: entries.map((e) => ({
      rank: e.rank,
      name: e.handle,
      detail: `${fmtShortDay(e.day)} · ${e.year} ${e.player_name}`,
      value: fmtScore(e.score),
    })),
  });
}
