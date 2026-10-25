/** 1234567 → "1,234,567" */
export const fmtScore = (n: number) => Math.round(n).toLocaleString("en-US");

/** 3 → "×3", 2.744 → "×2.74" */
export const fmtMult = (m: number) => `×${Number.isInteger(m) ? m : m.toFixed(2)}`;

const asUtcDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** "2026-10-24" → "Saturday, October 24" */
export const fmtDay = (day: string) =>
  asUtcDate(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** "2026-10-24" → "Sat, Oct 24" */
export const fmtShortDay = (day: string) =>
  asUtcDate(day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** "2026-10-24" → "Oct 24, 2026" */
export const fmtDate = (day: string) =>
  asUtcDate(day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** 20261019 → "Oct 19, 2026" */
export const fmtYmd = (ymd: number) => {
  const s = String(ymd);
  return fmtDate(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
};

/** 0.027 → "top 0.03%", 4.2 → "top 4.2%", 48.6 → "top 49%" */
export function fmtTopPercent(p: number): string {
  const shown = p < 0.1 ? p.toFixed(2) : p < 10 ? p.toFixed(1) : String(Math.round(p));
  return `top ${shown}%`;
}

/** 49417622 → "49.4M", 41400 → "41.4K" */
export const fmtCompact = (n: number) =>
  Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
