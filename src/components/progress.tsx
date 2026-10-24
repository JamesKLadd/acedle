/** Labelled progress bar, e.g. badges collected out of all badges. */
export function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono tabular-nums">
          {value.toLocaleString("en-US")} / {total.toLocaleString("en-US")}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(100 * value) / total}%` }} />
      </div>
    </div>
  );
}
