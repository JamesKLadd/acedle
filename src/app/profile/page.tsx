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
      <p className="py-10 text-center text-muted">
        No rolls yet.{" "}
        <Link href="/" className="font-medium text-accent-text underline decoration-2 underline-offset-4">
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
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-2"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {r.year} {r.playerName}
                {r.id === best?.id && rolls.length > 1 && (
                  <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent-text">
                    Best
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-muted">
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
