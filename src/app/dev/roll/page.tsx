import type { Metadata } from "next";

import { RollClient } from "./roll-client";

export const metadata: Metadata = { title: "Dev roll · Acedle" };

export default function DevRollPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Dev roll</h1>
      <p className="mt-1 mb-6 text-zinc-500 dark:text-zinc-400">
        Unlimited rolls for testing the scoring engine. Nothing is saved. Luck above 1× favours better-ranked players
        (sandbox only).
      </p>
      <RollClient />
    </main>
  );
}
