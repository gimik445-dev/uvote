"use client";

import { useEffect, useRef, useState } from "react";

// A pick-an-emoji control for the event cover icon, shown as a popup off a
// button — not a permanently-open grid taking up form space. Exists because
// not every laptop has an easy way to open an OS emoji picker (no emoji
// key, unfamiliar with Win+. / Cmd+Ctrl+Space), so this makes the field
// usable with just a mouse, no typing required.
//
// These render as plain-text emoji characters on purpose — that means each
// visitor sees their own device's native emoji design (Apple's on iPhone,
// Samsung's on Galaxy phones, Segoe on Windows, etc.), which is the
// familiar look people expect on their own device, rather than one fixed
// art style forced on everyone.
const EVENT_EMOJI = [
  "🏆", "🥇", "🥈", "🥉", "👑", "🌟", "⭐", "🎉",
  "🎊", "🎤", "🎭", "💃", "🕺", "🏅", "🎗️", "📣",
  "💐", "🎬", "⚽", "🏀", "📸", "🙏", "🕊️", "🧠",
  "📚", "❓", "🎯", "🎶",
];

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelScheduledClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  // A short delay rather than an instant close on mouseleave — the popup
  // sits just below the button, and this keeps a slightly-imprecise mouse
  // path from feeling like it slammed shut.
  function scheduleClose() {
    cancelScheduledClose();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => cancelScheduledClose(), []);

  return (
    <div
      className="relative inline-block"
      ref={containerRef}
      // Hover opens/closes it for mouse users (desktop) — no click needed.
      // The onClick below still toggles it too, since touch screens (phones)
      // don't really have hover — a tap is how they'll open this.
      onMouseEnter={() => {
        cancelScheduledClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        // Always opens (never toggles closed) — a click/tap is always
        // preceded by a synthetic hover-enter on the way to the target,
        // which already sets open=true; a naive toggle here would read
        // that as "already open" and immediately flip it back closed,
        // making the button seem unresponsive on first tap. Closing is
        // handled elsewhere: pick an emoji, click outside, hover away,
        // or Escape.
        onClick={() => setOpen(true)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Choose a cover emoji"
        className="input flex items-center justify-center cursor-pointer w-auto px-4"
      >
        <span className="text-3xl leading-none">{value || "🏆"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose a cover emoji"
          className="absolute z-20 top-full left-0 mt-2 p-3 bg-white border border-border-strong rounded-2xl shadow-xl grid grid-cols-6 gap-2 w-[280px]"
        >
          {EVENT_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="option"
              onClick={() => {
                onChange(emoji);
                setOpen(false);
              }}
              aria-label={`Use ${emoji} as the cover emoji`}
              aria-selected={value === emoji}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl leading-none transition-colors ${
                value === emoji
                  ? "bg-brand/10 border-2 border-brand"
                  : "border-2 border-transparent hover:bg-background"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
