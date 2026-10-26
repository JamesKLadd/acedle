import type { Metadata } from "next";
import { Suspense } from "react";

import { ChallengeView } from "./challenge-view";

export const metadata: Metadata = {
  title: "Daily challenge · Acedle",
  description: "Same card, same draw for everyone: how far can you take it?",
};

export default function ChallengePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-surface-2" />}>
        <ChallengeView />
      </Suspense>
    </main>
  );
}
