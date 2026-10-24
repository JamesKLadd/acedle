import type { Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";

import { DailyBoard } from "./boards";

export const metadata: Metadata = { title: "Today's leaderboard · Acedle" };

export default function DailyLeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <DailyBoard searchParams={searchParams} />
    </Suspense>
  );
}
