import type { Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";

import { DailyBoard } from "./boards";

export const metadata: Metadata = { title: "Today's leaderboard · Acedle" };

export default function DailyLeaderboardPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <DailyBoard />
    </Suspense>
  );
}
