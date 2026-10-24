import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { Progress } from "@/components/progress";
import { loadSeasons } from "@/lib/data/seasons";
import { playerDex, poolTotals } from "@/lib/profile/collection";
import { getMyRolls } from "@/lib/profile/queries";

export default function DexPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Dex />
    </Suspense>
  );
}

async function Dex() {
  const dex = playerDex(await getMyRolls());
  const totals = poolTotals(loadSeasons());
  return (
    <>
      <div className="flex flex-col gap-3">
        <Progress label="Players" value={dex.players.length} total={totals.players} />
        <Progress label="Player-seasons" value={dex.seasons} total={totals.seasons} />
        <Progress label="Years" value={dex.rollsPerYear.size} total={totals.years.length} />
      </div>

      <h2 className="mt-8 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Years</h2>
      <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
        {totals.years.map((y) => {
          const n = dex.rollsPerYear.get(y) ?? 0;
          return (
            <li
              key={y}
              title={n ? `${n} ${n === 1 ? "roll" : "rolls"}` : "Not rolled yet"}
              className={`rounded py-1.5 text-center font-mono text-sm tabular-nums ${
                n
                  ? "bg-accent font-semibold text-accent-ink"
                  : "bg-surface-2 text-subtle"
              }`}
            >
              {y}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Players</h2>
      {dex.players.length === 0 ? (
        <p className="py-6 text-center text-muted">Every player you roll is added here.</p>
      ) : (
        <ul className="flex flex-col">
          {dex.players.map((p) => (
            <li key={p.playerId} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted">
                  {p.country} · best finish #{p.bestRank}
                </span>
              </span>
              <span className="font-mono text-sm text-muted tabular-nums">{p.years.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
