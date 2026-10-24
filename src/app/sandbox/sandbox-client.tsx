"use client";

import { useState } from "react";

import type { SandboxRollResponse } from "@/app/api/sandbox/roll/route";
import { RollReveal } from "@/components/roll-reveal";
import { fmtTopPercent } from "@/lib/format";
import { MAX_LUCK, MIN_LUCK } from "@/lib/roll";

export function SandboxClient() {
  const [luck, setLuck] = useState(MIN_LUCK);
  // Each roll gets a new key so the reveal starts over.
  const [result, setResult] = useState<(SandboxRollResponse & { key: number }) | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function roll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sandbox/roll?luck=${luck}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Roll failed (${res.status})`);
      setRevealed(false);
      setResult({ ...((await res.json()) as SandboxRollResponse), key: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={roll}
          disabled={loading}
          className="rounded-lg bg-amber-400 px-6 py-3 text-lg font-semibold text-accent-ink hover:bg-amber-300 disabled:opacity-60"
        >
          {loading ? "Rolling…" : result ? "Roll again" : "Roll"}
        </button>
        <label className="flex items-center gap-3 text-sm">
          Luck
          <input
            type="range"
            min={MIN_LUCK}
            max={MAX_LUCK}
            step={1}
            value={luck}
            onChange={(e) => setLuck(Number(e.target.value))}
            className="w-40 accent-amber-400"
          />
          <span className="w-8 font-mono">{luck}×</span>
        </label>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <div>
          <RollReveal key={result.key} season={result.season} score={result.score} onDone={() => setRevealed(true)} />
          {revealed && (
            <p className="mt-3 animate-reveal text-sm text-muted">
              That&apos;s the {fmtTopPercent(result.topPercent)} of all seasons.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
