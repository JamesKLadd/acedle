"use client";

import { useEffect, useRef, useState } from "react";

import { BallIcon } from "@/components/brand";
import { sfx } from "@/lib/sound";
import { gameParams, lineCall, type LineCall } from "@/lib/tournament";

import { LineReview } from "./line-review";

/** Delay before the ball starts moving. */
const READY_MS = 700;
/** How long the call (IN / OUT) shows before the next set. */
const CALL_MS = 1000;

/** Position 0–1 of a ball bouncing between the ends, `x` passes after it started. */
const bounce = (x: number) => {
  const m = x % 2;
  return m <= 1 ? m : 2 - m;
};

/**
 * One set of the timing game: a ball sweeps along the track and the player
 * taps (or presses Space) when it's in the green (its white lines count as
 * in). `chance` (the player's odds) sets the green zone's size and the
 * ball's speed. Taps right by a line go to the line review.
 */
export function TimingGame({ chance, onResult }: { chance: number; onResult: (won: boolean) => void }) {
  const { zone, passMs } = gameParams(chance);
  // Placed after mount, so server and client render the same.
  const [center, setCenter] = useState<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "live" | "review" | "in" | "out">("ready");
  const [review, setReview] = useState<LineCall | null>(null);
  const ball = useRef<HTMLDivElement>(null);
  const start = useRef(0);
  const live = useRef(false);
  const result = useRef(onResult);
  useEffect(() => {
    result.current = onResult;
  });

  useEffect(() => {
    const c = zone / 2 + 0.06 + Math.random() * (1 - zone - 0.12);
    let raf = 0;
    const go = window.setTimeout(() => {
      start.current = performance.now();
      live.current = true;
      setPhase("live");
      raf = requestAnimationFrame(function step(now) {
        if (!live.current) return;
        if (ball.current) ball.current.style.left = `${bounce((now - start.current) / passMs) * 100}%`;
        raf = requestAnimationFrame(step);
      });
    }, READY_MS);
    setCenter(c);
    return () => {
      live.current = false;
      clearTimeout(go);
      cancelAnimationFrame(raf);
    };
  }, [zone, passMs]);

  function tap(at: number) {
    if (!live.current || center === null) return;
    live.current = false;
    const pos = bounce(Math.max(0, at - start.current) / passMs);
    const call = lineCall(pos, center, zone);
    if (ball.current) ball.current.style.left = `${pos * 100}%`;
    if (call.close) {
      setPhase("review");
      setReview(call);
      return;
    }
    announce(call.in);
    window.setTimeout(() => result.current(call.in), CALL_MS);
  }

  function announce(hit: boolean) {
    setPhase(hit ? "in" : "out");
    if (hit) sfx.hit();
    else sfx.miss();
  }

  // Space or Enter taps too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (!e.repeat) tap(e.timeStamp);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const message =
    phase === "ready"
      ? "Ready…"
      : phase === "live"
        ? "Tap when the ball is in the green"
        : phase === "review"
          ? "Close call…"
          : phase === "in"
          ? "In!"
          : "Out!";
  return (
    <div
      onPointerDown={(e) => tap(e.nativeEvent.timeStamp)}
      role="button"
      tabIndex={-1}
      aria-label="Tap when the ball is in the green zone"
      className={`relative cursor-pointer touch-manipulation rounded-lg border-2 border-fg bg-panel px-4 py-6 text-panel-fg select-none sm:px-6 ${
        phase === "out" ? "ring-2 ring-red-500/70" : phase === "in" ? "ring-2 ring-[#34c759]" : ""
      }`}
    >
      <p
        aria-live="polite"
        className={`flex h-9 items-center justify-center text-center font-display font-bold tracking-wide uppercase ${
          phase === "in" || phase === "out" ? "animate-pop text-3xl" : "text-xs text-panel-fg/70 sm:text-sm"
        } ${phase === "in" ? "text-[#34c759]" : phase === "out" ? "text-red-400" : ""}`}
      >
        {message}
      </p>
      <div className="relative mt-5 h-12 rounded-full bg-white/[0.07] ring-1 ring-white/10">
        <div className="absolute inset-y-0 right-5 left-5">
          {center !== null && (
            // The lines sit inside the zone's edges: a ball on the line is in.
            <div
              className={`absolute inset-y-1.5 border-x-2 border-white transition-colors ${
                phase === "out" ? "bg-[#34c759]/35" : "bg-[#34c759]/80"
              }`}
              style={{
                left: `${(center - zone / 2) * 100}%`,
                width: `${zone * 100}%`,
              }}
            />
          )}
          {/* The court's centre line, for looks. */}
          <div className="absolute inset-y-3 left-1/2 w-px bg-white/15" />
          <div ref={ball} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: "0%" }}>
            <BallIcon className="size-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
          </div>
        </div>
      </div>
      {review && (
        <LineReview call={review} onReveal={() => announce(review.in)} onDone={() => result.current(review.in)} />
      )}
      <p className="mt-4 text-center text-xs text-panel-fg/50">
        Tap anywhere here, or press <kbd className="rounded border border-white/15 px-1 font-mono">Space</kbd>
      </p>
    </div>
  );
}
