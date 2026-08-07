"use client";

import { useEffect, useRef, useState } from "react";

// A click-to-pick emoji for the event cover icon, shown as a popup off a
// button — not a permanently-open grid taking up form space. Exists because
// not every laptop has an easy way to open an OS emoji picker (no emoji
// key, unfamiliar with Win+. / Cmd+Ctrl+Space), so this makes the field
// usable with just a mouse, no typing required.
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

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="input flex items-center gap-3 cursor-pointer w-auto"
      >
        <span className="text-3xl leading-none">{value || "🏆"}</span>
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
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-[26px] leading-none transition-colors ${
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
