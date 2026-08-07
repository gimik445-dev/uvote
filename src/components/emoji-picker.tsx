"use client";

import { useEffect, useRef, useState } from "react";

// A pick-an-emoji control for the event cover icon, shown as a popup off a
// button — not a permanently-open grid taking up form space. Exists because
// not every laptop has an easy way to open an OS emoji picker (no emoji
// key, unfamiliar with Win+. / Cmd+Ctrl+Space), so this makes the field
// usable with just a mouse, no typing required.
//
// The glyphs are rendered as Twemoji SVGs (self-hosted under /public/emoji,
// see EMOJI_ICON below) instead of plain-text emoji characters — plain text
// renders through whatever emoji font the visitor's OS ships, which on
// Windows is the glossy/3D Segoe UI Fluent style that looked "weird" and
// inconsistent next to the rest of the flat UI. Twemoji gives every visitor
// the same crisp, flat art regardless of OS.
const EMOJI_ICON: Record<string, string> = {
  "🏆": "1f3c6",
  "🥇": "1f947",
  "🥈": "1f948",
  "🥉": "1f949",
  "👑": "1f451",
  "🌟": "1f31f",
  "⭐": "2b50",
  "🎉": "1f389",
  "🎊": "1f38a",
  "🎤": "1f3a4",
  "🎭": "1f3ad",
  "💃": "1f483",
  "🕺": "1f57a",
  "🏅": "1f3c5",
  "🎗️": "1f397",
  "📣": "1f4e3",
  "💐": "1f490",
  "🎬": "1f3ac",
  "⚽": "26bd",
  "🏀": "1f3c0",
  "📸": "1f4f8",
  "🙏": "1f64f",
  "🕊️": "1f54a",
  "🧠": "1f9e0",
  "📚": "1f4da",
  "❓": "2753",
  "🎯": "1f3af",
  "🎶": "1f3b6",
};
const EVENT_EMOJI = Object.keys(EMOJI_ICON);

function EmojiGlyph({ emoji, className }: { emoji: string; className?: string }) {
  const code = EMOJI_ICON[emoji] ?? EMOJI_ICON["🏆"];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/emoji/${code}.svg`} alt={emoji} draggable={false} className={className} />
  );
}

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
        className="input flex items-center gap-3 cursor-pointer w-auto"
      >
        <EmojiGlyph emoji={value || "🏆"} className="w-8 h-8" />
        <span className="text-xs font-bold text-brand">Change</span>
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
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                value === emoji
                  ? "bg-brand/10 border-2 border-brand"
                  : "border-2 border-transparent hover:bg-background"
              }`}
            >
              <EmojiGlyph emoji={emoji} className="w-7 h-7" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
