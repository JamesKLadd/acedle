import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RollCard } from "@/components/roll-card";
import { fmtDay } from "@/lib/format";
import { getMyRoll } from "@/lib/profile/queries";
import { toDailyRoll } from "@/lib/roll/daily";

export const metadata: Metadata = { title: "Roll · Acedle" };

export default function RollPage({ params }: PageProps<"/rolls/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/profile" className="text-sm text-zinc-500 hover:text-foreground">
        ← Roll history
      </Link>
      <Suspense fallback={<div className="mt-4 h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />}>
        <RollDetail params={params} />
      </Suspense>
    </main>
  );
}

/** One of the viewer's own rolls; anyone else's is a 404. */
async function RollDetail({ params }: { params: Promise<{ id: string }> }) {
  const row = await getMyRoll((await params).id);
  if (!row) notFound();
  const roll = toDailyRoll(row);
  return (
    <>
      <h1 className="mt-4 mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase">
        {fmtDay(roll.day)}, {roll.day.slice(0, 4)}
      </h1>
      <RollCard season={roll.season} score={roll.score} />
    </>
  );
}
