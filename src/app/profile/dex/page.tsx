import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { Progress } from "@/components/progress";
import { SectionTitle } from "@/components/ui";
import { loadSeasons } from "@/lib/data/seasons";
import { flag } from "@/lib/flags";
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
      <div className="flex flex-col gap-4 rounded-lg border-2 border-line bg-surface shadow-[4px_4px_0_0_var(--line)] p-5">
        <Progress label="Players" value={dex.players.length} total={totals.players} />
        <Progress label="Player-seasons" value={dex.seasons} total={totals.seasons} />
        <Progress label="Years" value={dex.rollsPerYear.size} total={totals.years.length} />
      </div>

      <SectionTitle className="mt-8 mb-3">Years</SectionTitle>
      <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
        {totals.years.map((y) => {
          const n = dex.rollsPerYear.get(y) ?? 0;
          return (
            <li
              key={y}
              title={n ? `${n} ${n === 1 ? "roll" : "rolls"}` : "Not rolled yet"}
              className={`relative rounded-lg py-2 text-center font-mono text-sm tabular-nums ${
                n ? "bg-accent font-semibold text-accent-ink shadow-sm" : "border border-dashed border-line text-subtle"
              }`}
            >
              {y}
              {n > 1 && (
                <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-fg text-[10px] text-bg">
                  {n}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <SectionTitle className="mt-8 mb-3">Players</SectionTitle>
      {dex.players.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-line py-10 text-center text-muted">
          Every player you roll is added here.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {dex.players.map((p) => (
            <li
              key={p.playerId}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border-2 border-line bg-surface shadow-[3px_3px_0_0_var(--line)] px-3 py-2.5"
            >
              <span className="text-2xl leading-none" aria-hidden>
                {flag(p.country)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.name}</span>
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
