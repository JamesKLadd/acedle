"use client";

import { useEffect, useRef, useState } from "react";

import { fmtScore } from "@/lib/format";
import { sfx } from "@/lib/sound";

const FLY_MS = 750;
const COUNT_MS = 1100;
const HOLD_MS = 900;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The player's total over all their rolls. With `adding`, today's score flies
 * up from the scoreboard (the element marked data-score) and the total counts
 * up to include it; `onDone` runs after. `sticky` pins it under the header
 * (during the reveal, so it's in view when the score arrives).
 */
export function TotalScore({
  total,
  rolls,
  adding = null,
  onDone,
  sticky = false,
}: {
  total: number;
  rolls: number;
  adding?: number | null;
  onDone?: () => void;
  sticky?: boolean;
}) {
  const [shown, setShown] = useState(total);
  const [phase, setPhase] = useState<"flying" | "counting" | "landed">("flying");
  const valueRef = useRef<HTMLParagraphElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (adding === null) return;
    const target = total + adding;
    let raf = 0;
    let timer = 0;
    const finish = () => {
      setShown(target);
      setPhase("landed");
      timer = window.setTimeout(() => done.current?.(), HOLD_MS);
    };
    const count = () => {
      sfx.land();
      setPhase("counting");
      const start = performance.now();
      raf = requestAnimationFrame(function step(now) {
        const t = Math.min(1, (now - start) / COUNT_MS);
        setShown(Math.round(total + adding * (1 - (1 - t) ** 3)));
        if (t < 1) raf = requestAnimationFrame(step);
        else finish();
      });
    };

    const src = document.querySelector<HTMLElement>("[data-score]");
    const dst = valueRef.current;
    if (prefersReducedMotion() || !src || !dst) {
      finish();
      return () => clearTimeout(timer);
    }
    // A copy of the score chip flies from the scoreboard to the total.
    const a = src.getBoundingClientRect();
    const b = dst.getBoundingClientRect();
    const fly = document.createElement("span");
    fly.textContent = `+${fmtScore(adding)}`;
    fly.className =
      "tabular pointer-events-none fixed z-50 rounded-md border-2 border-[#1f2233] bg-panel px-3 py-1 font-display text-xl text-gold shadow-lg";
    fly.style.left = `${a.left}px`;
    fly.style.top = `${a.top}px`;
    document.body.append(fly);
    const anim = fly.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(0.7)`, opacity: 0.4 },
      ],
      { duration: FLY_MS, easing: "cubic-bezier(.55,0,.3,1)", fill: "forwards" },
    );
    anim.finished.then(
      () => {
        fly.remove();
        count();
      },
      () => fly.remove(),
    );
    return () => {
      anim.cancel();
      fly.remove();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [adding, total]);

  const counting = adding !== null;
  return (
    // top-[61px]: below the site header and its stripe.
    <div
      className={`${sticky ? "sticky top-[61px] z-20 shadow-md" : ""} flex items-center gap-4 rounded-md border-2 border-fg bg-panel px-4 py-3 text-panel-fg`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-panel-fg/65 uppercase">Total score</p>
        <p
          ref={valueRef}
          className={`tabular font-display text-2xl break-all text-gold [text-shadow:2px_2px_0_rgb(0_0_0/0.35)] ${phase === "landed" ? "animate-pop" : ""}`}
        >
          {fmtScore(counting ? shown : total)}
        </p>
      </div>
      <p className="ml-auto shrink-0 text-right text-xs text-panel-fg/60">
        {counting ? (
          <span
            className={`font-mono text-sm font-bold text-gold ${phase === "flying" ? "opacity-0" : "animate-pop"}`}
          >
            +{fmtScore(adding)}
          </span>
        ) : (
          <>
            {rolls} {rolls === 1 ? "roll" : "rolls"}
          </>
        )}
      </p>
    </div>
  );
}
