import type { Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";

import { ChallengeBoard } from "../boards";

export const metadata: Metadata = { title: "Daily challenge board · Acedle" };

export default function ChallengeLeaderboardPage({ searchParams }: PageProps<"/leaderboard/challenge">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <ChallengeBoard searchParams={searchParams} />
    </Suspense>
  );
}
