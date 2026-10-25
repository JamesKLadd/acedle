// Per-browser preferences (theme, sound, tournament controls), kept in localStorage. Read them with
// the hooks below, which return the server-safe default until hydrated.

import { useCallback, useSyncExternalStore } from "react";

import { THEME_KEY } from "./theme-script";

export type Theme = "system" | "light" | "dark";

const SOUND_KEY = "acedle:sound";
const CONTROLS_KEY = "acedle:controls";
const LAST_ROLL_KEY = "acedle:lastRollDay";

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the choice just won't stick.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Sets data-theme on <html> for a choice ("system" follows the OS). */
export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(
    subscribe,
    () => (read(THEME_KEY) as Theme | null) ?? "system",
    () => "system" as Theme,
  );
  const set = useCallback((next: Theme) => {
    write(THEME_KEY, next === "system" ? null : next);
    applyTheme(next);
  }, []);
  return [theme, set];
}

/** Sound effects are off unless switched on. */
export function soundEnabled(): boolean {
  return read(SOUND_KEY) === "on";
}

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, soundEnabled, () => false);
  const set = useCallback((next: boolean) => write(SOUND_KEY, next ? "on" : null), []);
  return [on, set];
}

/**
 * How the tournament timing game is played: "tap" (the ball starts by itself,
 * tap to stop it) or "hold" (hold to start the ball, release to stop it).
 */
export type Controls = "tap" | "hold";

export function useControls(): [Controls, (controls: Controls) => void] {
  const controls = useSyncExternalStore(
    subscribe,
    () => (read(CONTROLS_KEY) === "hold" ? "hold" : "tap") as Controls,
    () => "tap" as Controls,
  );
  const set = useCallback((next: Controls) => write(CONTROLS_KEY, next === "tap" ? null : next), []);
  return [controls, set];
}

/** The UTC day this browser last saw its daily roll (drives the header's "Roll ready" pill). */
export function useLastRollDay(): string | null {
  return useSyncExternalStore(subscribe, () => read(LAST_ROLL_KEY), () => null);
}

export function rememberRollDay(day: string) {
  if (read(LAST_ROLL_KEY) !== day) write(LAST_ROLL_KEY, day);
}

function subscribeSeconds(listener: () => void) {
  const id = setInterval(listener, 1000);
  return () => clearInterval(id);
}

/** The current time in whole seconds, ticking every second (null while server rendering). */
export function useNowSeconds(): number | null {
  return useSyncExternalStore(subscribeSeconds, () => Math.floor(Date.now() / 1000), () => null);
}
