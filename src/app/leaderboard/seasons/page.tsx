import type { Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";

import { SeasonsBoard } from "../boards";

export const metadata: Metadata = { title: "Best seasons · Acedle" };

export default function SeasonsLeaderboardPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <SeasonsBoard />
    </Suspense>
  );
}
