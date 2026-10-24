import type { Metadata } from "next";

import { SandboxClient } from "./sandbox-client";

export const metadata: Metadata = { title: "Sandbox · Acedle" };

export default function SandboxPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">Sandbox</h1>
        <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-bold tracking-widest text-accent-ink">
          SANDBOX
        </span>
      </div>
      <p className="mt-1 mb-6 text-muted">
        Roll as often as you like. Nothing here is saved or counts toward your profile or the leaderboards. Turn up the
        luck to make better-ranked players more likely.
      </p>
      <SandboxClient />
    </main>
  );
}
