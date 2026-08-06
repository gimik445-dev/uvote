"use client";

import { useState } from "react";

// Fixed categorical order (never cycled) — the validated default palette,
// each hue chosen so adjacent slices stay distinguishable under color-vision
// deficiency. Past 8 nominees, the rest fold into a muted "Others" slice.
const SLOT_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];
const OTHERS_COLOR = "#9a978f";

type Slice = {
  id: string;
  displayName: string;
  voteCount: number;
  isSelf: boolean;
};

export function NomineeVoteChart({ slices, selfId }: { slices: Slice[]; selfId: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const total = slices.reduce((s, n) => s + n.voteCount, 0);
  const self = slices.find((s) => s.id === selfId);

  // Fold anything past 8 slots into a single "Others" slice so the palette
  // never has to invent a 9th hue.
  const ranked = [...slices].sort((a, b) => b.voteCount - a.voteCount);
  const shown = ranked.slice(0, 8);
  const rest = ranked.slice(8);
  const othersVotes = rest.reduce((s, n) => s + n.voteCount, 0);

  const entries = shown.map((s, i) => ({
    ...s,
    color: SLOT_COLORS[i % SLOT_COLORS.length],
  }));
  if (rest.length > 0) {
    entries.push({
      id: "__others__",
      displayName: `${rest.length} other nominee${rest.length === 1 ? "" : "s"}`,
      voteCount: othersVotes,
      isSelf: false,
      color: OTHERS_COLOR,
    });
  }

  if (total === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl mb-3">🗳️</div>
        <p className="text-sm text-ink-dim">No votes yet in this category — check back once voting opens.</p>
      </div>
    );
  }

  const size = 220;
  const r = 78;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = 3;

  let cumulative = 0;
  const arcs = entries.map((e) => {
    const raw = (e.voteCount / total) * circumference;
    const len = Math.max(raw - gap, 0.001);
    const offset = -cumulative;
    cumulative += raw;
    return { ...e, len, offset, pct: (e.voteCount / total) * 100 };
  });

  const active = arcs.find((a) => a.id === activeId) ?? null;
  const centerLabel = active
    ? { name: active.displayName, votes: active.voteCount, pct: active.pct }
    : { name: self ? "You" : "Total", votes: self?.voteCount ?? total, pct: self ? (self.voteCount / total) * 100 : 100 };

  return (
    <div className="card p-6">
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Vote share by nominee">
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {arcs.map((a) => (
                <circle
                  key={a.id}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={a.isSelf ? 34 : 26}
                  strokeDasharray={`${a.len} ${circumference - a.len}`}
                  strokeDashoffset={a.offset}
                  strokeLinecap="butt"
                  opacity={activeId && activeId !== a.id ? 0.35 : 1}
                  onMouseEnter={() => setActiveId(a.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onClick={() => setActiveId((cur) => (cur === a.id ? null : a.id))}
                  style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
                />
              ))}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="text-[28px] font-extrabold leading-none tabular-nums">
              {centerLabel.votes.toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-mute font-bold mt-1.5 truncate max-w-[110px]">
              {centerLabel.name}
            </div>
            <div className="text-[11px] text-ink-mute">{centerLabel.pct.toFixed(0)}% of votes</div>
          </div>
        </div>

        <div className="w-full mt-6 flex flex-col gap-2">
          {arcs.map((a) => (
            <button
              key={a.id}
              onMouseEnter={() => setActiveId(a.id)}
              onMouseLeave={() => setActiveId(null)}
              onClick={() => setActiveId((cur) => (cur === a.id ? null : a.id))}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                a.isSelf ? "bg-brand/8" : ""
              } ${activeId === a.id ? "bg-background" : ""}`}
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0 border border-black/10"
                style={{ backgroundColor: a.color }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold truncate flex-1">
                {a.displayName}
                {a.isSelf && (
                  <span className="ml-2 badge badge-mute align-middle" style={{ fontSize: "9px" }}>
                    You
                  </span>
                )}
              </span>
              <span className="text-xs text-ink-mute tabular-nums shrink-0">
                {a.voteCount.toLocaleString()} · {a.pct.toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
