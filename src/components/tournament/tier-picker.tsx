import { Trophy } from "lucide-react";

import { tierFormat, TIERS, type TierId } from "@/lib/tournament";

/** Each tier's stripe, from the smallest event up. */
const COLOR: Record<TierId, string> = {
  "250": "var(--blue)",
  "500": "var(--rare)",
  "1000": "var(--epic)",
  slam: "var(--legendary)",
};

/** The four tournaments to enter, as buttons. `pending` marks the one being drawn. */
export function TierPicker({
  onPick,
  pending,
}: {
  onPick: (tier: TierId) => void;
  pending: TierId | null;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {TIERS.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id!)}
          disabled={pending !== null}
          className="group flex items-stretch overflow-hidden rounded-md border-2 border-fg bg-surface text-left shadow-[3px_3px_0_0_var(--line)] transition hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--line)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-60"
        >
          <span className="w-2.5 shrink-0" style={{ background: COLOR[t.id!] }} />
          <span className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl leading-tight uppercase">
                {pending === t.id ? "Making the draw…" : t.name}
              </span>
              <span className="block text-xs text-muted">{tierFormat(t)}</span>
            </span>
            <Trophy
              className={`shrink-0 text-subtle transition group-hover:text-fg ${t.id === "slam" ? "size-6" : "size-5"}`}
              aria-hidden
            />
          </span>
        </button>
      ))}
    </div>
  );
}
