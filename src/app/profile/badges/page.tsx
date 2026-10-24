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
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{g.label}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {g.badges.map((b) => {
              const earned = b.timesEarned > 0;
              const secret = b.hidden && !earned;
              return (
                <li
                  key={b.id}
                  className={`rounded-lg border p-3 ${
                    earned
                      ? "border-accent/60 bg-accent-soft"
                      : "border-dashed border-line text-muted"
                  }`}
                >
                  <p className="font-medium">
                    {earned && <span className="mr-1.5 text-accent-text">✓</span>}
                    {secret ? "???" : b.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{secret ? "A hidden badge. Keep rolling." : b.description}</p>
                  {earned && b.firstDay && (
                    <p className="mt-1 text-xs text-muted">
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
