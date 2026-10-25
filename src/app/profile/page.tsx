import { ChevronRight, Crown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { RarityChip } from "@/components/roll-card";
import { buttonClass } from "@/components/ui";
import { flag } from "@/lib/flags";
import { fmtDate, fmtScore } from "@/lib/format";
import { summarizeRolls } from "@/lib/profile/collection";
import { getMyRolls } from "@/lib/profile/queries";
import { topPercent } from "@/lib/scoring/distribution";
import { ROUNDS, ROUNDS_SHORT } from "@/lib/tournament";

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
      <div className="rounded-2xl border border-dashed border-line py-12 text-center">
        <p className="text-muted">No rolls yet.</p>
        <Link href="/" className={`${buttonClass()} mt-4`}>
          Roll today&apos;s season
        </Link>
      </div>
    );
  }
  const best = summarizeRolls(rolls).best;
  return (
    <ol className="flex flex-col gap-2">
      {rolls.map((r) => (
        <li key={r.id}>
          <Link
            href={`/rolls/${r.id}`}
            className={`group grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition hover:border-accent/60 ${
              r.id === best?.id && rolls.length > 1 ? "border-legendary/50" : "border-line"
            }`}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-accent-text">{r.year}</span>
                <span className="truncate font-semibold">{r.playerName}</span>
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{fmtDate(r.day)}</span>
                <span aria-hidden>·</span>
                <span>
                  #{r.finalRank} · {flag(r.country)} {r.country}
                </span>
                {r.id === best?.id && rolls.length > 1 && <span className="font-semibold text-legendary">Best roll</span>}
                {r.tournament != null &&
                  (r.tournament === ROUNDS.length ? (
                    <span className="flex items-center gap-1 font-semibold text-legendary">
                      <Crown className="size-3.5" aria-hidden /> Tournament champion
                    </span>
                  ) : (
                    <span>Tournament: {ROUNDS_SHORT[r.tournament]}</span>
                  ))}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="tabular font-mono font-semibold">{fmtScore(r.score)}</span>
              <span className="hidden sm:block">
                <RarityChip topPercent={topPercent(r.score)} />
              </span>
            </span>
            <ChevronRight className="size-4 text-subtle transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ol>
  );
}
