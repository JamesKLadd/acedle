// Daily-roll streaks: consecutive UTC days with a roll.

const DAY_MS = 86_400_000;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;

/**
 * Days in a row with a roll, ending today, or ending yesterday when today's
 * roll hasn't happened yet (the streak is still alive until midnight UTC).
 */
export function currentStreak(days: readonly string[], today: string): number {
  const rolled = new Set(days.map(dayNumber));
  let d = dayNumber(today);
  if (!rolled.has(d)) d -= 1;
  let streak = 0;
  while (rolled.has(d)) {
    streak++;
    d -= 1;
  }
  return streak;
}

/** The longest run of consecutive days ever. */
export function bestStreak(days: readonly string[]): number {
  const sorted = [...new Set(days.map(dayNumber))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}
