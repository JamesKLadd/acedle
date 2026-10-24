"use client";

import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

import { rollToday } from "./actions";

/**
 * Rolls today's season. A visitor without a session becomes a guest first.
 * That sign-in happens in the browser, so Supabase rate-limits it per visitor
 * rather than per server. The page re-renders with the roll when the action
 * finishes.
 */
export function RollButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={roll}
        disabled={pending}
        className="rounded-lg bg-lime-500 px-8 py-4 text-xl font-semibold text-zinc-950 hover:bg-lime-400 disabled:opacity-60"
      >
        {pending ? "Rolling…" : "Roll today's season"}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
