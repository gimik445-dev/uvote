"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Mode = "light" | "dark" | "system";

const STORAGE_KEY = "uvote-theme";

const MODES: { value: Mode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "🖥️" },
];

// Tiny external store over localStorage[STORAGE_KEY] — read via
// useSyncExternalStore rather than "read in an effect + setState" so the
// server-rendered HTML (always "system", via getServerSnapshot) and the
// client's first render never disagree, and updates from this component
// or another tab both flow through the same subscription instead of a
// setState-in-effect that eslint's react-hooks rules flag as an
// anti-pattern.
const listeners = new Set<() => void>();

function getSnapshot(): Mode {
  return (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? "system";
}

function getServerSnapshot(): Mode {
  return "system";
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
  localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((l) => l());
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

// Small appearance switcher — hover (mouse) or tap (touch) opens a compact
// Light / Dark / System menu. The inline no-flash script in layout.tsx
// sets the class before first paint using whatever's already in
// localStorage; this component takes over from there.
export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function choose(next: Mode) {
    setStoredMode(next);
    setOpen(false);
  }

  const current = MODES.find((m) => m.value === mode) ?? MODES[2];

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Appearance"
        aria-expanded={open}
        onClick={(e) => {
          // Not a toggle: on desktop, onMouseEnter above has usually
          // already opened this by the time a click lands, and flipping
          // an already-open menu closed on click would close it before a
          // mouse user can pick an option. Always opening here is a no-op
          // in that case and is what actually opens it for touch, where
          // hover never fires.
          e.stopPropagation();
          setOpen(true);
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm border transition-colors"
        style={{
          background: "var(--glass-bg)",
          borderColor: "var(--glass-border)",
          backdropFilter: "blur(16px)",
        }}
      >
        {current.icon}
      </button>
      {open && (
        <div
          role="menu"
          // Anchored left-0 by default: in the site header's mobile layout
          // (below sm) this toggle is the first item in a full-width row,
          // sitting right at the left edge of the screen — a right-0 menu
          // there would extend off-screen to the left and be unreachable.
          // At sm+ the header switches to justify-end (button group hugs
          // the right edge), so the menu flips to right-0 there, matching
          // the same breakpoint the header uses.
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-32 rounded-2xl border p-1.5 z-50 shadow-lg"
          style={{
            background: "var(--glass-bg-strong)",
            borderColor: "var(--glass-border)",
            backdropFilter: "blur(24px) saturate(160%)",
          }}
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="menuitemradio"
              aria-checked={mode === m.value}
              onClick={() => choose(m.value)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                mode === m.value ? "bg-brand/15 text-brand" : "text-ink-dim hover:bg-brand/5"
              }`}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
