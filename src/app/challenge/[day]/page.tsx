import type { Metadata } from "next";
import { Suspense } from "react";

import { challengeNumber } from "@/lib/challenge";

import { ChallengeView } from "../challenge-view";

export async function generateMetadata({ params }: PageProps<"/challenge/[day]">): Promise<Metadata> {
  const { day } = await params;
  const title = /^\d{4}-\d{2}-\d{2}$/.test(day) ? `Daily challenge #${challengeNumber(day)}` : "Daily challenge";
  return { title: `${title} · Acedle`, description: "Same card, same draw for everyone: how far can you take it?" };
}

export default function ChallengeDayPage({ params }: PageProps<"/challenge/[day]">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-surface-2" />}>
        <ChallengeView day={params.then((p) => p.day)} />
      </Suspense>
    </main>
  );
}
