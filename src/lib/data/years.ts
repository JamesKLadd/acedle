/** First season that can be rolled. Ranking points and the modern tour structure start here. */
export const FIRST_YEAR = 1990;
/** Last season that can be rolled (may be live / in progress). */
export const LAST_YEAR = 2026;

export const ROLLABLE_YEARS: readonly number[] = Array.from(
  { length: LAST_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i,
);

/** Size of each season's player pool (year-end top N). */
export const POOL_SIZE = 100;
