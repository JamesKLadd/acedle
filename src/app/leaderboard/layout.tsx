import { Suspense } from "react";

import { TabLinks, TabNav } from "@/components/tab-nav";
import { PageTitle } from "@/components/ui";

const TABS = [
  { href: "/leaderboard", label: "Daily" },
  { href: "/leaderboard/weekly", label: "Weekly" },
  { href: "/leaderboard/all-time", label: "All time" },
  { href: "/leaderboard/seasons", label: "Seasons" },
];

export default function LeaderboardLayout({ children }: LayoutProps<"/leaderboard">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageTitle subtitle="Accounts only. Ties share a rank.">Leaderboards</PageTitle>
      <Suspense fallback={<TabLinks tabs={TABS} pathname={null} />}>
        <TabNav tabs={TABS} />
      </Suspense>
      {children}
    </main>
  );
}
