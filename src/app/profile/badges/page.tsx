import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { Progress } from "@/components/progress";
import { fmtDate } from "@/lib/format";
import { badgeCollection } from "@/lib/profile/collection";
import { getMyBadges } from "@/lib/profile/queries";
import { BADGES } from "@/lib/scoring";

export default function BadgesPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Badges />
    </Suspense>
  );
}

async function Badges() {
  const { collected, total, groups } = badgeCollection(BADGES, await getMyBadges());
  return (
    <>
      <Progress label="Badges collected" value={collected} total={total} />
      {groups.map((g) => (
        <section key={g.category} className="mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">{g.label}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {g.badges.map((b) => {
              const earned = b.timesEarned > 0;
              const secret = b.hidden && !earned;
              return (
                <li
                  key={b.id}
                  className={`rounded-lg border p-3 ${
                    earned
                      ? "border-lime-300 bg-lime-50/50 dark:border-lime-800 dark:bg-lime-950/30"
                      : "border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700"
                  }`}
                >
                  <p className="font-medium">
                    {earned && <span className="mr-1.5 text-lime-600 dark:text-lime-400">✓</span>}
                    {secret ? "???" : b.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{secret ? "A hidden badge. Keep rolling." : b.description}</p>
                  {earned && b.firstDay && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Earned {b.timesEarned}× · first on {fmtDate(b.firstDay)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
