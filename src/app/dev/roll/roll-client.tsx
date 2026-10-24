"use client";

import { useState } from "react";

import type { DevRollResponse } from "@/app/api/dev/roll/route";
import { RollCard } from "@/components/roll-card";

export function RollClient() {
  const [luck, setLuck] = useState(1);
  const [result, setResult] = useState<DevRollResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function roll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dev/roll?luck=${luck}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Roll failed (${res.status})`);
      setResult(await res.json());
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
          className="rounded-lg bg-lime-500 px-6 py-3 text-lg font-semibold text-zinc-950 hover:bg-lime-400 disabled:opacity-60"
        >
          {loading ? "Rolling…" : "Roll"}
        </button>
        <label className="flex items-center gap-3 text-sm">
          Luck
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={luck}
            onChange={(e) => setLuck(Number(e.target.value))}
            className="w-40 accent-lime-500"
          />
          <span className="w-8 font-mono">{luck}×</span>
        </label>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {result && <RollCard season={result.season} score={result.score} />}
    </div>
  );
}
