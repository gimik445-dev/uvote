"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { getActiveEvents } from "@/lib/data";

type Event = Awaited<ReturnType<typeof getActiveEvents>>[number];

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 60; // px of drag before we treat it as a swipe
const CLICK_THRESHOLD = 6; // px of drag below which a release still counts as a tap

// One-event-at-a-time carousel for the homepage "Live Events" section,
// swapped in for the old scrolling grid. Works the same way on phone and
// PC: Pointer Events cover touch drag and mouse drag with one set of
// handlers, arrow buttons are added back in for desktop (no touchscreen to
// swipe with), and dot indicators + keyboard arrows work on both.
export function EventCarousel({ events }: { events: Event[] }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [paused, setPaused] = useState(false);

  const dragStartX = useRef(0);
  const dragXRef = useRef(0);
  const draggingRef = useRef(false);
  const wasDragRef = useRef(false);
  const count = events.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  // Autoplay — pauses on hover/drag, resumes a couple seconds after, and
  // resets its timer on every manual navigation so you always get a full
  // interval after interacting. Off entirely for prefers-reduced-motion.
  useEffect(() => {
    if (count <= 1 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused, index, goTo]);

  // Gating and the swipe-threshold decision run off refs, not state — state
  // updates from a fast run of pointermove events (as in a real flick, or a
  // scripted/automated drag) can lag a render behind, so a state-gated check
  // can miss moves right after pointerdown. Refs update synchronously, so
  // nothing gets dropped; state is kept only for what actually needs to
  // trigger a re-render (the visible transform + transition toggle).
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    dragStartX.current = e.clientX;
    dragXRef.current = 0;
    wasDragRef.current = false;
    setIsDragging(true);
    setPaused(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = e.clientX - dragStartX.current;
    dragXRef.current = delta;
    if (Math.abs(delta) > CLICK_THRESHOLD) wasDragRef.current = true;
    setDragX(delta);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const delta = dragXRef.current;
    if (delta <= -SWIPE_THRESHOLD) goTo(index + 1);
    else if (delta >= SWIPE_THRESHOLD) goTo(index - 1);
    dragXRef.current = 0;
    setDragX(0);
    setIsDragging(false);
    window.setTimeout(() => setPaused(false), 2500);
  };

  // A drag that moved past the click threshold shouldn't also navigate —
  // this runs before the Link inside it gets the click.
  const onClickCapture = (e: React.MouseEvent) => {
    if (wasDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDragRef.current = false;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goTo(index + 1);
    if (e.key === "ArrowLeft") goTo(index - 1);
  };

  if (count === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        endDrag();
      }}
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Live events"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onClickCapture={onClickCapture}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="overflow-hidden rounded-[22px] touch-pan-y select-none cursor-grab active:cursor-grabbing"
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
            transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {events.map((event, i) => (
            <Slide key={event.id} event={event} active={i === index} />
          ))}
        </div>
      </div>

      {count > 1 && (
        // Controls live in a row below the card rather than overlaid on top
        // of it — the slide's text sits bottom-anchored and its height
        // varies with title/description length, so an overlaid arrow at a
        // fixed vertical position ends up covering the title on some
        // slides and not others. Below the card, there's nothing to cover.
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            type="button"
            aria-label="Previous event"
            onClick={() => goTo(index - 1)}
            className="hidden sm:flex w-9 h-9 rounded-full bg-surface border border-border items-center justify-center text-lg font-bold shadow-sm hover:border-brand hover:text-brand transition-colors"
          >
            ‹
          </button>

          <div className="flex gap-1.5">
            {events.map((event, i) => (
              <button
                key={event.id}
                type="button"
                aria-label={`Go to ${event.title}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-brand" : "w-1.5 bg-border-strong"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next event"
            onClick={() => goTo(index + 1)}
            className="hidden sm:flex w-9 h-9 rounded-full bg-surface border border-border items-center justify-center text-lg font-bold shadow-sm hover:border-brand hover:text-brand transition-colors"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

function Slide({ event, active }: { event: Event; active: boolean }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="relative shrink-0 w-full block"
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
    >
      <div
        // h-72 (not h-64) on mobile — the serif display font is wider/bolder
        // than the old sans stack, so a title that fit on one line before
        // can wrap to two now; the extra height keeps a wrapped title clear
        // of the emoji/Active badge pinned to the top corners.
        className={`h-72 sm:h-80 flex flex-col justify-end px-6 py-6 sm:px-9 sm:py-8 relative overflow-hidden ${
          event.coverImageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-brand to-brand-dark"
        }`}
        style={event.coverImageUrl ? { backgroundImage: `url(${event.coverImageUrl})` } : undefined}
      >
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/0"
          aria-hidden="true"
        />
        {!event.coverImageUrl && (
          <span className="absolute top-6 left-6 sm:top-8 sm:left-9 text-5xl opacity-90">
            {event.coverEmoji}
          </span>
        )}
        <span className="badge badge-good absolute top-6 right-6 sm:top-8 sm:right-9 z-10">Active</span>

        <div className="relative z-10 text-white">
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-2">{event.title}</h3>
          {event.description && (
            <p className="text-sm sm:text-base text-white/80 mb-4 line-clamp-2 max-w-lg">
              {event.description}
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
            <div>
              <span className="text-white/60 uppercase tracking-wide text-[10px] sm:text-xs">
                USSD Code
              </span>
              <div className="font-bold mt-0.5">{event.ussdCode ?? "—"}</div>
            </div>
            <div>
              <span className="text-white/60 uppercase tracking-wide text-[10px] sm:text-xs">
                Per vote
              </span>
              <div className="font-bold mt-0.5">
                {event.currency} {event.pricePerVote}
              </div>
            </div>
            <div>
              <span className="text-white/60 uppercase tracking-wide text-[10px] sm:text-xs">By</span>
              <div className="font-bold mt-0.5">{event.organization.name}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
