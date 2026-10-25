"use client";

import { Settings } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { applyTheme, useControls, useSound, useTheme, type Controls, type Theme } from "@/lib/prefs";

const iconButton =
  "grid size-8 place-items-center rounded-lg sm:size-9 text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent";

/** A row of options, one of them chosen. */
function Choice<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id}>
      <p id={id} className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
        {label}
      </p>
      <div className="mt-1.5 flex rounded-md border-2 border-fg bg-surface-2 p-0.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 rounded-[4px] px-2 py-1.5 text-xs font-bold transition ${
              value === v ? "bg-blue text-panel-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const CONTROLS_HINT: Record<Controls, string> = {
  tap: "The ball starts by itself. Tap to stop it.",
  hold: "Hold to start the ball, let go to stop it.",
};

/** The settings menu in the site header: sound, theme and tournament controls. */
export function HeaderControls() {
  const [theme, setTheme] = useTheme();
  const [sound, setSound] = useSound();
  const [controls, setControls] = useControls();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // In system mode, follow the OS when it switches.
  useEffect(() => {
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        className={`${iconButton} ${open ? "bg-surface-2 text-fg" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Settings"
        title="Settings"
      >
        <Settings className="size-4.5" aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute top-full right-0 z-50 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-lg border-2 border-fg bg-surface p-4 shadow-[4px_4px_0_0_var(--blue)]"
        >
          <Choice
            label="Sound"
            options={[
              ["off", "Off"],
              ["on", "On"],
            ]}
            value={sound ? "on" : "off"}
            onChange={(v) => setSound(v === "on")}
          />
          <Choice<Theme>
            label="Theme"
            options={[
              ["system", "System"],
              ["light", "Light"],
              ["dark", "Dark"],
            ]}
            value={theme}
            onChange={setTheme}
          />
          <Choice<Controls>
            label="Tournament controls"
            hint={CONTROLS_HINT[controls]}
            options={[
              ["tap", "Tap to stop"],
              ["hold", "Hold & release"],
            ]}
            value={controls}
            onChange={setControls}
          />
        </div>
      )}
    </div>
  );
}
