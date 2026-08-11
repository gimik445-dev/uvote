"use client";

import { useEffect, useSyncExternalStore } from "react";

type Mode = "light" | "system";

const STORAGE_KEY = "uvote-theme";

const ICONS: Record<Mode, string> = {
  light: "☀️",
  system: "🖥️",
};

const LABELS: Record<Mode, string> = {
  light: "Light",
  system: "System",
};

// Tiny external store over localStorage[STORAGE_KEY] — read via
// useSyncExternalStore rather than "read in an effect + setState" so the
// server-rendered HTML (always "light", via getServerSnapshot) and the
// client's first render never disagree, and updates from this component
// or another tab both flow through the same subscription instead of a
// setState-in-effect that eslint's react-hooks rules flag as an
// anti-pattern.
const listeners = new Set<() => void>();

// Only "system" is ever explicitly stored. Anything else — no key, or a
// leftover "dark"/"light" value from an earlier version of this toggle —
// is treated as "light". Light is the default so the app opens in a known,
// consistent look regardless of the visitor's OS setting; someone whose
// device is in dark mode has to opt in to "System" once for this app to
// follow it.
function getSnapshot(): Mode {
  return localStorage.getItem(STORAGE_KEY) === "system" ? "system" : "light";
}

function getServerSnapshot(): Mode {
  return "light";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function setStoredMode(next: Mode) {
  if (next === "system") {
    localStorage.setItem(STORAGE_KEY, "system");
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((l) => l());
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: Mode) {
  const dark = mode === "system" && systemPrefersDark();
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

// Small appearance switcher. With only two states left there's no need for
// a dropdown to pick from — the button itself shows the current mode, and
// a click flips straight to the other one and applies it immediately.
export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mirror the resolved mode onto <html> whenever it changes, and keep it
  // correct if the OS-level scheme flips while "system" is selected. This
  // is DOM synchronization (the appropriate use of an effect), not state
  // derivation — nothing here calls setState.
  useEffect(() => {
    applyTheme(mode);
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const next: Mode = mode === "light" ? "system" : "light";

  return (
    <button
      type="button"
      aria-label={`Appearance: ${LABELS[mode]}. Click to switch to ${LABELS[next]}.`}
      title={`Appearance: ${LABELS[mode]} — click for ${LABELS[next]}`}
      onClick={() => setStoredMode(next)}
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm border transition-colors"
      style={{
        background: "var(--glass-bg)",
        borderColor: "var(--glass-border)",
        backdropFilter: "blur(16px)",
      }}
    >
      {ICONS[mode]}
    </button>
  );
}
