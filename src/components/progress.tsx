/** Labelled progress bar, e.g. badges collected out of all badges. */
export function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-mono tabular-nums">
          {value.toLocaleString("en-US")} / {total.toLocaleString("en-US")}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div className="h-full rounded-full bg-lime-500" style={{ width: `${(100 * value) / total}%` }} />
      </div>
    </div>
  );
}
