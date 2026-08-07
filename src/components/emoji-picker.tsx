"use client";

// A small click-to-pick grid of emoji for the event cover icon. Exists
// because not every laptop has an easy way to open an OS emoji picker (no
// emoji key, unfamiliar with Win+. / Cmd+Ctrl+Space) — this makes the field
// usable with just a mouse, no typing or system picker required. The text
// input next to it still works too, for anyone who *can* type/paste one.
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
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {EVENT_EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          aria-label={`Use ${emoji} as the cover emoji`}
          aria-pressed={value === emoji}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition-colors ${
            value === emoji
              ? "border-brand bg-brand/10"
              : "border-border hover:bg-background"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
