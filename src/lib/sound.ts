// Small synthesized sound effects (Web Audio, no files). Silent unless the
// player switched sound on in the header.

import { soundEnabled } from "./prefs";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !soundEnabled()) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  { at = 0, dur = 0.12, type = "sine", gain = 0.12, slideTo }: {
    at?: number;
    dur?: number;
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
  } = {},
) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  /** A reel passing one item. */
  tick: () => tone(1800, { dur: 0.025, type: "square", gain: 0.025 }),
  /** A reel locking in. */
  land: () => {
    tone(330, { dur: 0.1, type: "triangle", gain: 0.14 });
    tone(660, { at: 0.05, dur: 0.14, type: "triangle", gain: 0.1 });
  },
  /** A points badge; `level` 0–1 raises the pitch for bigger badges. */
  points: (level: number) => {
    const f = 620 + level * 640;
    tone(f, { dur: 0.1, type: "triangle", gain: 0.1 });
    tone(f * 1.5, { at: 0.04, dur: 0.14, gain: 0.05 });
  },
  /** A multiplier landing. */
  multiplier: (level: number) => {
    tone(160 + level * 120, { dur: 0.28, type: "sawtooth", gain: 0.06, slideTo: 420 + level * 300 });
    tone(880 + level * 400, { at: 0.12, dur: 0.22, gain: 0.08 });
  },
  /** Tournament: the ball was in. */
  hit: () => {
    tone(880, { dur: 0.06, type: "square", gain: 0.05 });
    tone(1320, { at: 0.05, dur: 0.16, type: "triangle", gain: 0.1 });
  },
  /** Tournament: the ball was out. */
  miss: () => tone(240, { dur: 0.3, type: "sawtooth", gain: 0.06, slideTo: 120 }),
  /** Tournament: a close call goes to the line review. */
  review: () => {
    tone(392, { dur: 0.09, type: "triangle", gain: 0.08 });
    tone(523, { at: 0.1, dur: 0.09, type: "triangle", gain: 0.08 });
    tone(659, { at: 0.2, dur: 0.18, type: "triangle", gain: 0.08 });
  },
  /** Tournament: the ball landing in the line review. */
  bounce: () => tone(150, { dur: 0.08, type: "triangle", gain: 0.12, slideTo: 90 }),
  /** End of a legendary or mythic reveal. */
  fanfare: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.32, type: "triangle", gain: 0.12 }));
  },
};
