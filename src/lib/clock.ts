/** UTC calendar day, YYYY-MM-DD, of a timestamp in milliseconds. */
export const utcDayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Milliseconds until the next UTC midnight, when the daily roll resets. */
export function msUntilReset(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now;
}

/** 27_733_000 → "07:42:13" */
export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
