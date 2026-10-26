import { Swords } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { buttonClass } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { runsOf } from "@/lib/challenge-store";
import { utcDay } from "@/lib/roll/daily";

import { History } from "../../challenge/challenge-view";

export const metadata: Metadata = { title: "Your challenges · Acedle" };

export default function ChallengesTab() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Challenges />
    </Suspense>
  );
}

/** The viewer's daily challenges, newest first, and their challenge streak. */
async function Challenges() {
  const { userId } = await getViewer();
  const runs = userId ? await runsOf(userId).catch(() => []) : [];
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-line px-6 py-12 text-center">
        <Swords className="mx-auto size-8 text-subtle" aria-hidden />
        <p className="mt-3 text-muted">
          No challenges yet. Every day everyone gets the same card in the same draw: see how far you can take it.
        </p>
        <Link href="/challenge" className={`${buttonClass()} mt-4`}>
          Today&apos;s challenge
        </Link>
      </div>
    );
  }
  return <History runs={runs} today={utcDay()} />;
}
