import type { Metadata } from "next";

import { PageTitle } from "@/components/ui";

import { SandboxClient } from "./sandbox-client";
import { PracticeLink } from "./season/practice-view";

export const metadata: Metadata = { title: "Sandbox · Acedle" };

export default function SandboxPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <PageTitle subtitle="Roll as often as you like. Nothing here is saved or counts toward your profile or the leaderboards. Turn up the luck to make better-ranked players more likely.">
          Sandbox{" "}
          <span className="ml-1 rounded-md bg-amber-400 px-2 py-0.5 align-middle font-sans text-xs font-bold tracking-[0.2em] text-zinc-950">
            NOT SAVED
          </span>
        </PageTitle>
      </div>
      <PracticeLink />
      <SandboxClient />
    </main>
  );
}
