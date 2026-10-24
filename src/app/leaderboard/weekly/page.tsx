import type { Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";

import { WeeklyBoard } from "../boards";

export const metadata: Metadata = { title: "Weekly leaderboard · Acedle" };

export default function WeeklyLeaderboardPage({ searchParams }: PageProps<"/leaderboard/weekly">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <WeeklyBoard searchParams={searchParams} />
    </Suspense>
  );
}
