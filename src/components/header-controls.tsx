"use client";

import { Monitor, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect } from "react";

import { applyTheme, useSound, useTheme, type Theme } from "@/lib/prefs";

const NEXT_THEME: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };
const THEME_LABEL: Record<Theme, string> = { system: "Theme: system", light: "Theme: light", dark: "Theme: dark" };

const iconButton =
  "grid size-8 place-items-center rounded-lg sm:size-9 text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent";

/** Sound and theme toggles in the site header. */
export function HeaderControls() {
  const [theme, setTheme] = useTheme();
  const [sound, setSound] = useSound();

  // In system mode, follow the OS when it switches.
  useEffect(() => {
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const ThemeIcon = THEME_ICON[theme];
  const SoundIcon = sound ? Volume2 : VolumeX;
  return (
    <div className="flex items-center">
      <button
        className={iconButton}
        onClick={() => setSound(!sound)}
        aria-pressed={sound}
        aria-label={sound ? "Sound on" : "Sound off"}
        title={sound ? "Sound on" : "Sound off"}
      >
        <SoundIcon className="size-4.5" aria-hidden />
      </button>
      <button
        className={iconButton}
        onClick={() => setTheme(NEXT_THEME[theme])}
        aria-label={THEME_LABEL[theme]}
        title={THEME_LABEL[theme]}
      >
        <ThemeIcon className="size-4.5" aria-hidden />
      </button>
    </div>
  );
}
