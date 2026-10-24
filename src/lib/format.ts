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
