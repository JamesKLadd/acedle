"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { RollReveal } from "@/components/roll-reveal";
import { fmtDay } from "@/lib/format";
import type { DailyRoll } from "@/lib/roll/daily";
import { createClient } from "@/lib/supabase/client";

import { rollToday } from "./actions";

/**
 * Rolls today's season and plays the reveal. A visitor without a session
 * becomes a guest first. That sign-in happens in the browser, so Supabase
 * rate-limits it per visitor rather than per server. When the reveal ends,
 * the page refreshes into the stored roll (with rank and share).
 */
export function RollButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealing, setRevealing] = useState<DailyRoll | null>(null);

  function roll() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          setError(`Couldn't start a guest session: ${error.message}`);
          return;
        }
      }
      const result = await rollToday();
      if (!result.ok) setError(result.error);
      // Already rolled (e.g. in another tab): just show it.
      else if (!result.created) router.refresh();
      else setRevealing(result.roll);
    });
  }

  if (revealing) {
    return (
      <div>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-muted uppercase">
          Today&apos;s roll · {fmtDay(revealing.day)}
        </h2>
        <RollReveal season={revealing.season} score={revealing.score} onDone={() => router.refresh()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={roll}
        disabled={pending}
        className="rounded-lg bg-accent px-8 py-4 text-xl font-semibold text-accent-ink hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Rolling…" : "Roll today's season"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
