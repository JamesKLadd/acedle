import Link from "next/link";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { fmtDate, fmtScore } from "@/lib/format";
import { summarizeRolls } from "@/lib/profile/collection";
import { getMyRolls } from "@/lib/profile/queries";

export default function HistoryPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <History />
    </Suspense>
  );
}

async function History() {
  const rolls = await getMyRolls();
  if (rolls.length === 0) {
    return (
      <p className="py-10 text-center text-zinc-500">
        No rolls yet.{" "}
        <Link href="/" className="font-medium text-lime-600 underline underline-offset-4 dark:text-lime-400">
          Roll today&apos;s season
        </Link>
      </p>
    );
  }
  const best = summarizeRolls(rolls).best;
  return (
    <ol className="flex flex-col">
      {rolls.map((r) => (
        <li key={r.id}>
          <Link
            href={`/rolls/${r.id}`}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {r.year} {r.playerName}
                {r.id === best?.id && rolls.length > 1 && (
                  <span className="ml-2 rounded bg-lime-100 px-1.5 py-0.5 text-xs text-lime-900 dark:bg-lime-900/50 dark:text-lime-200">
                    Best
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {fmtDate(r.day)} · #{r.finalRank} · {r.country}
              </span>
            </span>
            <span className="font-mono font-semibold tabular-nums">{fmtScore(r.score)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
