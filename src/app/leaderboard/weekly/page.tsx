import type { Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";

import { WeeklyBoard } from "../boards";

export const metadata: Metadata = { title: "Weekly leaderboard · Acedle" };

export default function WeeklyLeaderboardPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <WeeklyBoard />
    </Suspense>
  );
}
