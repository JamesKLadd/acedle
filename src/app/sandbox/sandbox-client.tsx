"use client";

import { Dices, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { SandboxRollResponse } from "@/app/api/sandbox/roll/route";
import { RollReveal } from "@/components/roll-reveal";
import { Tournament } from "@/components/tournament/tournament";
import { buttonClass } from "@/components/ui";
import { MAX_LUCK, MIN_LUCK } from "@/lib/roll";
import type { TournamentSetup } from "@/lib/tournament";

const isFreeKey = (e: KeyboardEvent) =>
  !(e.target instanceof HTMLElement && e.target.closest("input, textarea, select, button, a, [contenteditable]"));

export function SandboxClient() {
  const [luck, setLuck] = useState(MIN_LUCK);
  // Each roll gets a new key so the reveal starts over.
  const [result, setResult] = useState<(SandboxRollResponse & { key: number }) | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A practice tournament for the current roll (nothing is saved).
  const [draw, setDraw] = useState<TournamentSetup | null>(null);
  const [drawing, setDrawing] = useState(false);
  const drawRef = useRef<HTMLDivElement>(null);

  async function enterTournament() {
    if (!result) return;
    setDrawing(true);
    setError(null);
    try {
      const res = await fetch(`/api/sandbox/tournament?year=${result.season.year}&player=${result.season.playerId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Couldn't make the draw (${res.status})`);
      setDraw((await res.json()) as TournamentSetup);
      requestAnimationFrame(() => drawRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDrawing(false);
    }
  }

  async function roll() {
    setLoading(true);
    setError(null);
    setDraw(null);
    try {
      const res = await fetch(`/api/sandbox/roll?luck=${luck}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Roll failed (${res.status})`);
      setRevealing(true);
      setResult({ ...((await res.json()) as SandboxRollResponse), key: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // R rolls again; Space rolls when nothing is revealing (Space skips a reveal).
  // Off during a tournament, where Space plays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loading || draw || !isFreeKey(e)) return;
      if (e.key === "r" || e.key === "R" || (e.key === " " && !revealing)) {
        e.preventDefault();
        void roll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface p-4">
        <button onClick={roll} disabled={loading} className={buttonClass({ size: "lg" })}>
          <Dices className={`size-5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {loading ? "Rolling…" : result ? "Roll again" : "Roll"}
        </button>
        <label className="flex items-center gap-3 text-sm font-medium">
          Luck
          <input
            type="range"
            min={MIN_LUCK}
            max={MAX_LUCK}
            step={1}
            value={luck}
            onChange={(e) => setLuck(Number(e.target.value))}
            className="w-40 accent-[var(--accent)]"
          />
          <span className="tabular w-8 font-mono">{luck}×</span>
        </label>
        <p className="text-xs text-subtle sm:ml-auto">
          <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">R</kbd> roll ·{" "}
          <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">Space</kbd> skip
        </p>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <RollReveal
          key={result.key}
          season={result.season}
          score={result.score}
          decoys={result.decoys}
          topPercent={result.topPercent}
          onDone={() => setRevealing(false)}
        />
      )}

      {result && !revealing && !draw && (
        <button
          onClick={enterTournament}
          disabled={drawing}
          className="group flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 text-left transition hover:border-accent/60 disabled:opacity-60"
        >
          <Trophy className="size-7 shrink-0 text-accent-text" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{drawing ? "Making the draw…" : "Enter a tournament"}</span>
            <span className="block text-sm text-muted">
              Take {result.season.year} {result.season.name} into a 16-player draw. Practice only: nothing is saved.
            </span>
          </span>
        </button>
      )}

      {result && draw && (
        <div ref={drawRef} className="scroll-mt-20">
          <Tournament key={result.key} setup={draw} initialSets={[]} />
        </div>
      )}
    </div>
  );
}
