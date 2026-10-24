import { Gem, HelpCircle, Layers, Lock, Swords, TrendingUp, Trophy, User, Zap, type LucideIcon } from "lucide-react";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { Progress } from "@/components/progress";
import { CATEGORY_STYLES } from "@/components/roll-card";
import { SectionTitle } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { badgeCollection } from "@/lib/profile/collection";
import { getMyBadges } from "@/lib/profile/queries";
import { BADGES } from "@/lib/scoring";
import type { BadgeCategory } from "@/lib/scoring/types";

const CATEGORY_ICONS: Record<BadgeCategory, LucideIcon> = {
  titles: Trophy,
  surface: Layers,
  ranking: TrendingUp,
  matches: Swords,
  serve: Zap,
  profile: User,
  jackpot: Gem,
};

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
      {groups.map((g) => {
        const Icon = CATEGORY_ICONS[g.category];
        const got = g.badges.filter((b) => b.timesEarned > 0).length;
        return (
          <section key={g.category} className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <SectionTitle>{g.label}</SectionTitle>
              <span className="tabular text-xs text-muted">
                {got}/{g.badges.length}
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {g.badges.map((b) => {
                const earned = b.timesEarned > 0;
                const secret = b.hidden && !earned;
                const TileIcon = earned ? Icon : secret ? HelpCircle : Lock;
                return (
                  <li
                    key={b.id}
                    className={`flex gap-3 rounded-xl border p-3 ${
                      earned ? "border-line bg-surface" : "border-dashed border-line bg-transparent"
                    }`}
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                        earned ? CATEGORY_STYLES[b.category] : "bg-surface-2 text-subtle"
                      }`}
                    >
                      <TileIcon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-semibold ${earned ? "" : "text-muted"}`}>
                        {secret ? "???" : b.name}
                        {earned && <span className="ml-2 font-mono text-xs text-accent-text">×{b.timesEarned}</span>}
                      </span>
                      <span className="block text-xs text-muted">
                        {secret ? "A hidden badge. Keep rolling." : b.description}
                      </span>
                      {earned && b.firstDay && (
                        <span className="mt-0.5 block text-[11px] text-subtle">First earned {fmtDate(b.firstDay)}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
