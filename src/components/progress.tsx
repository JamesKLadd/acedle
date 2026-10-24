/** Labelled progress bar, e.g. badges collected out of all badges. */
export function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? (100 * value) / total : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular font-mono text-muted">
          {value.toLocaleString("en-US")} / {total.toLocaleString("en-US")}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700"
          style={{ width: `${Math.max(pct, value > 0 ? 1.5 : 0)}%` }}
        />
      </div>
    </div>
  );
}
