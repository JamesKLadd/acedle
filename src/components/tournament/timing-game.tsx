"use client";

import { useEffect, useRef, useState } from "react";

import { BallIcon } from "@/components/brand";
import { useControls } from "@/lib/prefs";
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
 * stops it in the green (its white lines count as in). With the "tap"
 * controls the ball starts by itself and a tap (or Space) stops it; with
 * "hold" the player holds to start it and releases to stop it. `chance`
 * (the player's odds) sets the green zone's size and the ball's speed. Stops
 * right by a line go to the line review.
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

  const [controls] = useControls();
  const raf = useRef(0);

  useEffect(() => {
    setCenter(zone / 2 + 0.06 + Math.random() * (1 - zone - 0.12));
    return () => {
      live.current = false;
      cancelAnimationFrame(raf.current);
    };
  }, [zone]);

  /** Sets the ball going from the left end. */
  function startBall(at: number) {
    if (live.current || phase !== "ready") return;
    start.current = at;
    live.current = true;
    setPhase("live");
    raf.current = requestAnimationFrame(function step(now) {
      if (!live.current) return;
      if (ball.current) ball.current.style.left = `${bounce(Math.max(0, now - start.current) / passMs) * 100}%`;
      raf.current = requestAnimationFrame(step);
    });
  }

  // Tap controls: the ball starts by itself after a moment.
  useEffect(() => {
    if (controls !== "tap" || phase !== "ready") return;
    const go = window.setTimeout(() => startBall(performance.now()), READY_MS);
    return () => clearTimeout(go);
  });

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

  /** A press: stops the ball (tap controls) or starts it (hold controls). */
  function press(at: number) {
    if (controls === "hold") startBall(at);
    else tap(at);
  }

  /** A release: stops the ball (hold controls). */
  function release(at: number) {
    if (controls === "hold") tap(at);
  }

  // Space or Enter plays too.
  useEffect(() => {
    const isKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";
    const onDown = (e: KeyboardEvent) => {
      if (!isKey(e)) return;
      e.preventDefault();
      if (!e.repeat) press(e.timeStamp);
    };
    const onUp = (e: KeyboardEvent) => {
      if (isKey(e)) release(e.timeStamp);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  });

  const message =
    phase === "ready"
      ? controls === "hold"
        ? "Hold to start the ball"
        : "Ready…"
      : phase === "live"
        ? controls === "hold"
          ? "Let go when it's in the green"
          : "Tap when the ball is in the green"
        : phase === "review"
          ? "Close call…"
          : phase === "in"
          ? "In!"
          : "Out!";
  return (
    <div
      onPointerDown={(e) => {
        // Keeps the release coming here even if the finger slides off (when the pointer is still down).
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        press(e.nativeEvent.timeStamp);
      }}
      onPointerUp={(e) => release(e.nativeEvent.timeStamp)}
      onPointerCancel={(e) => release(e.nativeEvent.timeStamp)}
      // A long press would open the context menu on phones.
      onContextMenu={(e) => e.preventDefault()}
      role="button"
      tabIndex={-1}
      aria-label="Stop the ball when it's in the green zone"
      // Holding mustn't scroll the page.
      className={`relative cursor-pointer rounded-lg [-webkit-touch-callout:none] ${controls === "hold" ? "touch-none" : "touch-manipulation"} border-2 border-fg bg-panel px-4 py-6 text-panel-fg select-none sm:px-6 ${
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
        {controls === "hold" ? "Hold anywhere here, or hold " : "Tap anywhere here, or press "}
        <kbd className="rounded border border-white/15 px-1 font-mono">Space</kbd>
        {controls === "hold" && ", and let go"}
      </p>
    </div>
  );
}
