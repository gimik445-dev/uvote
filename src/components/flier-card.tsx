"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// Portrait, print-friendly proportions (roughly A4) at a resolution that
// still looks sharp printed at A5/A6 — organizers and nominees are meant
// to download this and print it, not just view it on screen.
const CANVAS_W = 1000;
const CANVAS_H = 1400;
const PAD = 60;
// A corner badge, not the hero — deliberately small so the photo and name
// stay the focal point, matching how pageant/awards fliers usually put the
// voting code in a small badge rather than center stage.
const QR_SIZE = 160;
const GAP = 24;
const BRAND = "#5b57e8";
const BRAND_DARK = "#1e1b6e";
const ACCENT = "#f5a623";
const SITE_LABEL = "uvote.online";
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/**
 * A printable flier: a photo background, a big name, a price-per-vote bar,
 * and a small QR code badge in the bottom-right corner with the uVote site
 * name — used both for a whole event (organizer dashboard) and for a single
 * nominee (nominee dashboard), just with different copy and photo.
 */
export function FlierCard({
  url,
  kicker,
  title,
  subtitle,
  pricePerVote,
  photoUrl,
  fallbackEmoji,
  fallbackInitials,
}: {
  /** The voting link the QR code encodes. */
  url: string;
  /** Small label above the title, e.g. "TO VOTE" or the platform tagline. */
  kicker?: string | null;
  /** The big headline — event title or nominee name. */
  title: string;
  /** Optional line under the title, e.g. category or organization name. */
  subtitle?: string | null;
  pricePerVote: string;
  /** Background photo (event cover or nominee photo). */
  photoUrl?: string | null;
  /** Shown centered when there's no photo — pick one of emoji/initials. */
  fallbackEmoji?: string | null;
  fallbackInitials?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    setError(null);
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    async function render() {
      if (!ctx) return;
      try {
        const hasPhoto = Boolean(photoUrl);

        if (photoUrl) {
          const img = await loadImage(photoUrl);
          if (cancelled) return;
          drawCover(ctx, img, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
          bgGrad.addColorStop(0, BRAND);
          bgGrad.addColorStop(1, BRAND_DARK);
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Dark gradient overlay, heaviest at the bottom where all the text
        // sits, so everything stays legible over any photo.
        const overlay = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        overlay.addColorStop(0, "rgba(8,8,20,0.35)");
        overlay.addColorStop(0.55, "rgba(8,8,20,0.25)");
        overlay.addColorStop(0.78, "rgba(6,6,16,0.72)");
        overlay.addColorStop(1, "rgba(4,4,12,0.92)");
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        if (!hasPhoto && (fallbackEmoji || fallbackInitials)) {
          ctx.textAlign = "center";
          if (fallbackEmoji) {
            ctx.font = `160px ${FONT}`;
            ctx.fillText(fallbackEmoji, CANVAS_W / 2, 420);
          } else if (fallbackInitials) {
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.beginPath();
            ctx.arc(CANVAS_W / 2, 340, 130, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = `800 96px ${FONT}`;
            ctx.fillText(fallbackInitials, CANVAS_W / 2, 372);
          }
        }

        // Top-left uVote wordmark lockup
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = `800 38px ${FONT}`;
        ctx.fillText("uVote", PAD, PAD + 34);
        ctx.font = `700 15px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText("PAY-PER-VOTE FUNDRAISING", PAD, PAD + 58);

        // Bottom row geometry, computed first so the text block above it
        // can be sized to land exactly above it, never overlapping.
        const siteLineY = CANVAS_H - 46;
        const rowBottomY = siteLineY - 40;
        const rowY = rowBottomY - QR_SIZE;
        const barW = CANVAS_W - PAD * 2 - QR_SIZE - GAP;

        // Kicker / title / subtitle text block, laid out bottom-up so a
        // longer wrapped title never collides with the kicker above it.
        ctx.textAlign = "center";
        let cursorY = rowY - 56;
        if (subtitle) {
          ctx.font = `600 26px ${FONT}`;
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(subtitle, CANVAS_W / 2, cursorY);
          cursorY -= 64;
        }

        ctx.font = `800 76px ${FONT}`;
        ctx.fillStyle = ACCENT;
        cursorY = wrapCenteredTextBottomUp(
          ctx,
          title,
          CANVAS_W / 2,
          cursorY,
          CANVAS_W - PAD * 2,
          84,
          3
        );
        cursorY -= 90;

        if (kicker) {
          ctx.font = `700 24px ${FONT}`;
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillText(letterSpace(kicker.toUpperCase()), CANVAS_W / 2, cursorY);
        }

        // Bottom row: price bar on the left, QR badge at the far right.
        drawRoundedRect(ctx, PAD, rowY, barW, QR_SIZE, 20);
        ctx.fillStyle = "rgba(8,8,20,0.55)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.font = `700 18px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(letterSpace("COST PER VOTE"), PAD + 28, rowY + 46);
        ctx.font = `800 46px ${FONT}`;
        ctx.fillStyle = ACCENT;
        ctx.fillText(`GHS ${pricePerVote}`, PAD + 28, rowY + 100);

        const qrX = PAD + barW + GAP;
        const qrY = rowY;
        drawRoundedRect(ctx, qrX, qrY, QR_SIZE, QR_SIZE, 18);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        const qrPad = 12;
        const qrCanvas = document.createElement("canvas");
        await QRCode.toCanvas(qrCanvas, url, {
          errorCorrectionLevel: "M",
          margin: 0,
          width: QR_SIZE - qrPad * 2,
          color: { dark: BRAND_DARK, light: "#ffffff" },
        });
        if (cancelled) return;
        ctx.drawImage(qrCanvas, qrX + qrPad, qrY + qrPad, QR_SIZE - qrPad * 2, QR_SIZE - qrPad * 2);

        ctx.textAlign = "center";
        ctx.font = `700 16px ${FONT}`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(letterSpace("SCAN TO VOTE"), qrX + QR_SIZE / 2, qrY - 14);

        // Site name, centered, below the row.
        ctx.font = `800 26px ${FONT}`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(SITE_LABEL, CANVAS_W / 2, siteLineY);

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError("Couldn't generate the flier — please try again.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [url, kicker, title, subtitle, pricePerVote, photoUrl, fallbackEmoji, fallbackInitials]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "uvote-flier.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-2xl overflow-hidden border border-border-strong shadow-lg bg-white"
        style={{ width: 280 }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-auto"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        />
      </div>
      {error ? (
        <p className="text-critical text-xs text-center max-w-[280px]">{error}</p>
      ) : (
        <p className="text-xs text-ink-mute text-center max-w-[280px]">
          Print this and post it — the QR code opens the voting page directly.
        </p>
      )}
      <button
        type="button"
        onClick={download}
        disabled={!ready}
        className="btn btn-primary btn-sm"
      >
        {ready ? "Download flier" : "Generating…"}
      </button>
    </div>
  );
}

// Canvas has no native letter-spacing — hair spaces between characters fake
// it well enough for short uppercase labels like "TO VOTE" or "SCAN TO VOTE".
function letterSpace(text: string): string {
  return text.split("").join("  ");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Crops+scales `img` to fill the (dx, dy, dw, dh) box without distorting it —
// the canvas equivalent of CSS `background-size: cover`.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Word-wraps `text` into centered lines within `maxWidth`, anchored so the
// LAST line's baseline sits at `bottomY` — callers stack elements bottom-up
// so a longer wrapped title pushes the elements above it up, rather than
// colliding with them. Caps at `maxLines`; a line beyond that gets folded
// into an ellipsized final line instead of overflowing the canvas. Returns
// the y just above the first (topmost) line, for the next element up.
function wrapCenteredTextBottomUp(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  bottomY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = shown[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    shown[maxLines - 1] = `${last}…`;
  }

  for (let i = shown.length - 1; i >= 0; i--) {
    const y = bottomY - (shown.length - 1 - i) * lineHeight;
    ctx.fillText(shown[i], cx, y);
  }
  return bottomY - (shown.length - 1) * lineHeight;
}
