import type { Metadata } from "next";
import Link from "next/link";

import { PracticeView } from "./practice-view";

export const metadata: Metadata = { title: "Practice season · Acedle" };

export default function PracticeSeasonPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <Link href="/sandbox" className="hover:text-fg">
          ← Sandbox
        </Link>
        <span>Practice only: kept in this browser, never on the leaderboards.</span>
      </div>
      <PracticeView />
    </main>
  );
}
