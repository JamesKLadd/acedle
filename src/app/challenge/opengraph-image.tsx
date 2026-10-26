import { connection } from "next/server";

import { todaysChallenge } from "@/lib/challenge-store";
import { OG_SIZE } from "@/lib/og";

import { challengeImage } from "./challenge-image";

export const alt = "Today's challenge on Acedle";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Today's challenge. */
export default async function Image() {
  await connection();
  return challengeImage(await todaysChallenge());
}
