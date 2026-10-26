import { connection } from "next/server";

import { challengeDay } from "@/lib/challenge";
import { getChallenge } from "@/lib/challenge-store";
import { OG_SIZE } from "@/lib/og";
import { utcDay } from "@/lib/roll/daily";

import { challengeImage } from "../challenge-image";

export const alt = "A daily challenge on Acedle";
export const size = OG_SIZE;
export const contentType = "image/png";

/** A day's challenge. */
export default async function Image({ params }: { params: Promise<{ day: string }> }) {
  await connection();
  const day = challengeDay((await params).day, utcDay());
  return challengeImage(day ? await getChallenge(day).catch(() => null) : null);
}
