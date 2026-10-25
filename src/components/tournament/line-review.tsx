"use client";

// The line review for close calls in the timing game, in the style of the
// electronic line-calling replays on TV: the ball flies in over the net and
// leaves its mark by the line, then the camera swoops down above the mark
// for the call. A tiny 3D scene (metres, a real court's lines) drawn as SVG.

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { sfx } from "@/lib/sound";
import type { LineCall } from "@/lib/tournament";

type V3 = readonly [number, number, number];

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3) => scale(a, 1 / Math.hypot(...a));
const mix = (a: V3, b: V3, t: number) => add(a, scale(sub(b, a), t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Timeline, ms from the start of the review. */
const LAND = 750;
const BOUNCE_END = 1050;
const SWOOP_END = 1900;
const DONE = 3300;

/** Ball mark half-width (across the line) and half-length (along it), metres. */
const MARK_A = 0.02;
const MARK_B = 0.035;
const BALL_R = 0.033;
/** The line: 5 cm wide, from x = 0 (its outer edge) into the court. */
const LINE_W = 0.05;

const COURT = "#2552b0";
const OUTSIDE = "#2f7d55";
const WHITE = "#f4f6f8";
const BALL = "#dfeb3f";

interface Camera {
  pos: V3;
  target: V3;
  up: V3;
  /** Focal length as a multiple of the view's height. */
  focal: number;
}

/**
 * A camera that projects world points to the SVG, centred at `center` (a
 * share of the width); `mirror` flips it left to right.
 */
function projector(cam: Camera, w: number, h: number, mirror: boolean, center: number) {
  const f = norm(sub(cam.target, cam.pos));
  const r = norm(cross(f, cam.up));
  const u = cross(r, f);
  const focal = cam.focal * h;
  const NEAR = 0.02;
  const toCam = (p: V3): V3 => {
    const d = sub(p, cam.pos);
    return [dot(d, r), dot(d, u), dot(d, f)];
  };
  const screen = (c: V3): [number, number] => {
    const x = (focal * c[0]) / c[2];
    return [w * center + (mirror ? -x : x), h / 2 - (focal * c[1]) / c[2]];
  };
  return {
    /** A point and its depth, or null behind the camera. */
    point(p: V3): { x: number; y: number; depth: number } | null {
      const c = toCam(p);
      if (c[2] < NEAR) return null;
      const [x, y] = screen(c);
      return { x, y, depth: c[2] };
    },
    /** A flat polygon as SVG points, clipped to what's in front of the camera. */
    polygon(points: readonly V3[]): string | undefined {
      const cam = points.map(toCam);
      const kept: V3[] = [];
      cam.forEach((a, i) => {
        const b = cam[(i + 1) % cam.length];
        if (a[2] >= NEAR) kept.push(a);
        if (a[2] >= NEAR !== b[2] >= NEAR) kept.push(mix(a, b, (NEAR - a[2]) / (b[2] - a[2])));
      });
      if (kept.length < 3) return undefined;
      return kept.map((c) => screen(c).map((v) => v.toFixed(1)).join(",")).join(" ");
    },
    focal,
  };
}

/** A ground rectangle from x0..x1, y0..y1. */
const rect = (x0: number, x1: number, y0: number, y1: number): V3[] => [
  [x0, y0, 0],
  [x1, y0, 0],
  [x1, y1, 0],
  [x0, y1, 0],
];

/** An ellipse on the ground, as a polygon. */
const ellipse = (cx: number, cy: number, a: number, b: number): V3[] =>
  Array.from({ length: 28 }, (_, i) => {
    const t = (i / 28) * Math.PI * 2;
    return [cx + a * Math.cos(t), cy + b * Math.sin(t), 0];
  });

/**
 * The scene: the line runs along y with its outer edge at x = 0 and the
 * court on +x. The ball lands at y = 0, `mark` metres from the line's outer
 * edge to the mark's centre (negative = outside). The near baseline is at
 * y = 6, the net at y = -5.9.
 */
function scene(mark: number) {
  const land: V3 = [mark, 0, 0];
  const from: V3 = [mark + 2.4, -12, 0];
  /** The ball at time `t` ms (before LAND it's in flight, then bouncing). */
  const ball = (t: number): V3 => {
    if (t <= LAND) {
      const u = clamp01(t / LAND);
      const p = mix(from, land, u);
      return [p[0], p[1], (1 - u) * (1.7 + 1.0 * u)];
    }
    const v = clamp01((t - LAND) / (BOUNCE_END - LAND));
    const dir = norm(sub(land, from));
    const p = add(land, scale(dir, 2.6 * v));
    return [p[0], p[1], 1.25 * v * (1 - 0.45 * v) + BALL_R];
  };
  return { land, ball };
}

/** Where the camera starts (behind the baseline, looking down the line) and ends (above the mark). */
function cameraAt(t: number, mark: number, lookX: number): Camera {
  const start: Camera = { pos: [-0.9, 6.5, 1.7], target: [mark, -1.2, 0.15], up: [0, 0, 1], focal: 1.3 };
  const end: Camera = { pos: [lookX, 0.001, 0.25], target: [lookX, 0, 0], up: [0, -1, 0], focal: 2.2 };
  const e = ease(clamp01((t - BOUNCE_END) / (SWOOP_END - BOUNCE_END)));
  return {
    pos: mix(start.pos, end.pos, e),
    target: mix(start.target, end.target, e),
    up: norm(mix(start.up, end.up, e)),
    focal: Math.exp(lerp(Math.log(start.focal), Math.log(end.focal), e)),
  };
}

/**
 * The review for `call`, filling its (positioned) parent. Calls `onReveal`
 * when the call shows and `onDone` when it's over; a tap skips to the call,
 * a second tap ends it.
 */
export function LineReview({
  call,
  onReveal,
  onDone,
}: {
  call: LineCall;
  onReveal: () => void;
  onDone: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [t, setT] = useState(0);
  const start = useRef(0);
  const revealed = useRef(false);
  const done = useRef(false);
  const handlers = useRef({ onReveal, onDone });
  useEffect(() => {
    handlers.current = { onReveal, onDone };
  });

  // Out: the mark's edge stops `mm` short of the line. In: it reaches `mm` onto it.
  const edge = (call.in ? 1 : -1) * (call.mm / 1000);
  const mark = edge - MARK_A;
  const lookX = call.in ? mark : edge / 2;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    start.current = performance.now() - (reduced ? SWOOP_END : 0);
    let raf = 0;
    let bounced = false;
    sfx.review();
    const step = (now: number) => {
      const at = now - start.current;
      if (!bounced && at >= LAND) {
        bounced = true;
        sfx.bounce();
      }
      if (!revealed.current && at >= SWOOP_END) {
        revealed.current = true;
        handlers.current.onReveal();
      }
      if (at >= DONE) {
        if (!done.current) {
          done.current = true;
          handlers.current.onDone();
        }
        return;
      }
      setT(at);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** A tap skips to the call, then past it. */
  function skip() {
    const at = performance.now() - start.current;
    if (at < SWOOP_END) start.current = performance.now() - SWOOP_END;
    else start.current = performance.now() - DONE;
  }

  // Space or Enter skips too, like they tap in the game.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      ref={box}
      onPointerDown={(e) => {
        e.stopPropagation();
        skip();
      }}
      className="absolute inset-0 z-10 overflow-hidden rounded-[inherit] bg-[#0b1633]"
      role="img"
      aria-label={`Line review: ${call.in ? "in" : `out by ${call.mm} millimetres`}`}
    >
      {size && <Scene t={t} w={size.w} h={size.h} mark={mark} lookX={lookX} mirror={call.side === "left"} />}
      <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white/85 uppercase">
        <span className="size-2 animate-pulse rounded-full bg-red-500" />
        Line review
      </div>
      {t < SWOOP_END && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/70">
          Tap to skip
        </div>
      )}
      {t >= SWOOP_END && (
        <div
          className={`pointer-events-none absolute right-3 bottom-3 flex animate-pop flex-col items-center rounded-md border-2 border-white px-4 py-1 text-white shadow-[3px_3px_0_0_rgb(0_0_0/0.4)] ${
            call.in ? "bg-[#1f9d55]" : "bg-[#d63a2f]"
          }`}
        >
          <span className="font-display text-3xl leading-none tracking-wide">{call.in ? "IN" : "OUT"}</span>
          <span className="mt-0.5 font-mono text-[11px] font-bold">
            {call.in ? (call.mm <= 10 ? "clipped the line" : "on the line") : `by ${call.mm} mm`}
          </span>
        </div>
      )}
    </div>
  );
}

function Scene({
  t,
  w,
  h,
  mark,
  lookX,
  mirror,
}: {
  t: number;
  w: number;
  h: number;
  mark: number;
  lookX: number;
  mirror: boolean;
}) {
  const swoop = clamp01((t - BOUNCE_END) / (SWOOP_END - BOUNCE_END));
  // Ends left of centre, clear of the call in the bottom right.
  const cam = projector(cameraAt(t, mark, lookX), w, h, mirror, lerp(0.5, 0.38, ease(swoop)));
  const { land, ball } = scene(mark);

  // The ball's track so far, fading as the camera swoops in.
  const track: string[] = [];
  const last = Math.min(t, BOUNCE_END);
  for (let i = 0; i <= 30; i++) {
    const p = cam.point(ball((last * i) / 30));
    if (p) track.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  const now = cam.point(ball(last));
  const shadow = ball(last);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" aria-hidden>
      <defs>
        <linearGradient id="line-review-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060c1f" />
          <stop offset="1" stopColor="#13254d" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#line-review-sky)" />
      <polygon points={cam.polygon(rect(-14, 22, -40, 14))} fill={OUTSIDE} />
      {/* Singles court: the review's line is its left sideline. */}
      <polygon points={cam.polygon(rect(LINE_W, 8.23 - LINE_W, -17.72, 5.95))} fill={COURT} />
      <polygon points={cam.polygon(rect(0, LINE_W, -17.77, 6))} fill={WHITE} />
      <polygon points={cam.polygon(rect(8.23 - LINE_W, 8.23, -17.77, 6))} fill={WHITE} />
      <polygon points={cam.polygon(rect(0, 8.23, 5.95, 6))} fill={WHITE} />
      <polygon points={cam.polygon(rect(0, 8.23, -17.77, -17.72))} fill={WHITE} />
      {/* Service lines and the centre service line. */}
      <polygon points={cam.polygon(rect(LINE_W, 8.23 - LINE_W, 0.465, 0.515))} fill={WHITE} />
      <polygon points={cam.polygon(rect(LINE_W, 8.23 - LINE_W, -12.285, -12.235))} fill={WHITE} />
      <polygon points={cam.polygon(rect(4.09, 4.14, -12.285, 0.515))} fill={WHITE} />
      {/* The net. */}
      <polygon
        points={cam.polygon([
          [-0.9, -5.885, 0],
          [9.13, -5.885, 0],
          [9.13, -5.885, 1.07],
          [-0.9, -5.885, 1.07],
        ])}
        fill="rgb(8 12 26 / 0.55)"
      />
      <polygon
        points={cam.polygon([
          [-0.9, -5.885, 1.0],
          [9.13, -5.885, 0.914],
          [9.13, -5.885, 0.96],
          [-0.9, -5.885, 1.05],
        ])}
        fill={WHITE}
      />

      {/* The mark, once the ball has landed. */}
      {t >= LAND && (
        <polygon
          points={cam.polygon(ellipse(land[0], land[1], MARK_A, MARK_B))}
          fill="#c9d43c"
          fillOpacity={0.92}
          stroke="#0b1633"
          strokeOpacity={0.6}
          strokeWidth={1}
        />
      )}

      {swoop < 1 && (
        <g opacity={1 - swoop}>
          {now && (
            <polygon
              points={cam.polygon(ellipse(shadow[0], shadow[1], BALL_R, BALL_R))}
              fill="rgb(0 0 0 / 0.35)"
            />
          )}
          <polyline
            points={track.join(" ")}
            fill="none"
            stroke={BALL}
            strokeOpacity={0.55}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {now && (
            <circle
              cx={now.x}
              cy={now.y}
              r={Math.max(2, (cam.focal * BALL_R) / now.depth)}
              fill={BALL}
              stroke="#3b3f1a"
              strokeOpacity={0.5}
            />
          )}
        </g>
      )}
    </svg>
  );
}
