import type { Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";

import { AllTimeBoard } from "../boards";

export const metadata: Metadata = { title: "All-time leaderboard · Acedle" };

export default function AllTimeLeaderboardPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <AllTimeBoard />
    </Suspense>
  );
}
