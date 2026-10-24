"use client";

import { useState } from "react";

import type { DevRollResponse } from "@/app/api/dev/roll/route";
import type { BadgeCategory, EarnedBadge } from "@/lib/scoring/types";

const CATEGORY_STYLES: Record<BadgeCategory, string> = {
  titles: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  surface: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  ranking: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  matches: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  serve: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
  profile: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  jackpot: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtMult = (m: number) => `×${Number.isInteger(m) ? m : m.toFixed(2)}`;

function BadgeRow({ badge }: { badge: EarnedBadge }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[badge.category]}`}>
        {badge.category}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{badge.name}</span>
        <span className="block truncate text-sm text-zinc-500 dark:text-zinc-400">{badge.detail}</span>
      </span>
      <span className="shrink-0 font-mono tabular-nums">
        {badge.multiplier !== null ? fmtMult(badge.multiplier) : `+${fmt(badge.points)}`}
      </span>
    </li>
  );
}

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

  const s = result?.season;
  const score = result?.score;

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

      {s && score && (
        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
            {s.year}
            {s.live && " · live season"}
          </p>
          <h2 className="text-2xl font-bold">{s.name}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            #{s.ranking.final} · {s.country} · {s.matches.wins}–{s.matches.losses} · {s.titles.length} titles
          </p>

          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {score.badges.map((b) => (
              <BadgeRow key={b.id} badge={b} />
            ))}
          </ul>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-4 text-center dark:border-zinc-800">
            <div>
              <dt className="text-xs text-zinc-500 uppercase">Base</dt>
              <dd className="font-mono tabular-nums">{fmt(score.base)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 uppercase">Multiplier</dt>
              <dd className="font-mono tabular-nums">{fmtMult(score.multiplier)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 uppercase">Score</dt>
              <dd className="font-mono text-xl font-bold tabular-nums">{fmt(score.total)}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
