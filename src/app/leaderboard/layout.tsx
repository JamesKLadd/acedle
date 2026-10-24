import { TabNav } from "@/components/tab-nav";

const TABS = [
  { href: "/leaderboard", label: "Today" },
  { href: "/leaderboard/weekly", label: "This week" },
  { href: "/leaderboard/all-time", label: "All time" },
];

export default function LeaderboardLayout({ children }: LayoutProps<"/leaderboard">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Leaderboards</h1>
      <TabNav tabs={TABS} />
      {children}
    </main>
  );
}
