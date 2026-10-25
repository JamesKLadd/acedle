"use client";

import { Dices } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import { RollReveal } from "@/components/roll-reveal";
import { TotalScore } from "@/components/total-score";
import { buttonClass, Eyebrow } from "@/components/ui";
import { fmtShortDay } from "@/lib/format";
import { rememberRollDay } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/client";

import { rollToday, type RollTodayResult } from "./actions";

type Rolled = Extract<RollTodayResult, { ok: true }>;

/** True when a key press isn't aimed at a form field or another control. */
const isFreeKey = (e: KeyboardEvent) =>
  !(e.target instanceof HTMLElement && e.target.closest("input, textarea, select, button, a, [contenteditable]"));

/**
 * Rolls today's season and plays the reveal. A visitor without a session
 * becomes a guest first. That sign-in happens in the browser, so Supabase
 * rate-limits it per visitor rather than per server. When the reveal ends,
 * the score is added to the player's total (`total` over `rolls` rolls so
 * far), then the page refreshes into the stored roll (with rank and share).
 */
export function RollButton({ total, rolls, children }: { total: number; rolls: number; children?: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealing, setRevealing] = useState<Rolled | null>(null);
  const [tallying, setTallying] = useState(false);

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
      if (!result.ok) return setError(result.error);
      rememberRollDay(result.roll.day);
      // Already rolled (e.g. in another tab): just show it.
      if (!result.created) router.refresh();
      else setRevealing(result);
    });
  }

  // Space or Enter rolls.
  useEffect(() => {
    if (revealing || pending) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && isFreeKey(e)) {
        e.preventDefault();
        roll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (revealing) {
    return (
      <div className="flex flex-col gap-4">
        <TotalScore
          total={total}
          rolls={rolls}
          adding={tallying ? revealing.roll.score.total : null}
          onDone={() => router.refresh()}
          sticky
        />
        <div>
          <Eyebrow className="mb-3">Today&apos;s roll · {fmtShortDay(revealing.roll.day)}</Eyebrow>
          <RollReveal
            season={revealing.roll.season}
            score={revealing.roll.score}
            decoys={revealing.decoys}
            topPercent={revealing.topPercent}
            onDone={() => setTallying(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {rolls > 0 && (
        <div className="mb-1 w-full">
          <TotalScore total={total} rolls={rolls} />
        </div>
      )}
      {children}
      <button onClick={roll} disabled={pending} className={`${buttonClass({ size: "lg" })} min-w-64`}>
        <Dices className={`size-5 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {pending ? "Rolling…" : "Roll today's season"}
      </button>
      <p className="text-xs text-subtle">
        or press <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">Space</kbd>
      </p>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
