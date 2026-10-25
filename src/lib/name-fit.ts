// How wide names come out in the display face (Alfa Slab One, in capitals),
// so they can be sized to wrap between words, never inside one.

/** Advance widths of the display face's capitals, in em (measured in the browser). */
const WIDTHS: Record<string, number> = {
  A: 0.81, B: 0.77, C: 0.72, D: 0.8, E: 0.71, F: 0.63, G: 0.78, H: 0.84, I: 0.42, J: 0.67, K: 0.83, L: 0.65, M: 1.14,
  N: 0.94, O: 0.79, P: 0.74, Q: 0.81, R: 0.8, S: 0.67, T: 0.78, U: 0.78, V: 0.79, W: 1.21, X: 0.8, Y: 0.78, Z: 0.69,
  "-": 0.39, "'": 0.19, ".": 0.24,
};
/** Digits, other symbols and letters we haven't measured: about as wide as an average capital. */
const OTHER = 0.8;

/**
 * Width in em of the longest piece of `text` that can't wrap: words, split
 * after hyphens ("Roger-Vasselin" can break after "ROGER-"). Accents don't
 * change a capital's width.
 */
export function longestWordEm(text: string): number {
  const pieces = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/\s+|(?<=-)/);
  let widest = 0;
  for (const piece of pieces) {
    let w = 0;
    for (const ch of piece) w += WIDTHS[ch] ?? OTHER;
    widest = Math.max(widest, w);
  }
  return widest;
}
