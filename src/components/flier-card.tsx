"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// Portrait, print-friendly proportions (roughly A4) at a resolution that
// still looks sharp printed at A5/A6 — organizers are meant to download
// this and print it, not just view it on screen.
const CANVAS_W = 1000;
const CANVAS_H = 1400;
// Deliberately small — this is one element at the bottom of a full poster,
// not the hero (see QrCodeCard for the full-size standalone QR code).
const QR_SIZE = 200;
const BRAND = "#5b57e8";
const BRAND_DARK = "#1e1b6e";
const ACCENT = "#f5a623";
const SITE_LABEL = "uvote.online";
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/**
 * A printable event flier: title, price-per-vote, a small QR code, and the
 * uVote site name at the bottom — everything an organizer needs to post the
 * event publicly without having to design anything themselves.
 */
export function FlierCard({
  url,
  title,
  pricePerVote,
  coverEmoji,
  coverImageUrl,
}: {
  url: string;
  title: string;
  pricePerVote: string;
  coverEmoji?: string | null;
  coverImageUrl?: string | null;
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
        const hasPhoto = Boolean(coverImageUrl);

        if (coverImageUrl) {
          const bg = await loadImage(coverImageUrl);
          if (cancelled) return;
          drawCover(ctx, bg, 0, 0, CANVAS_W, CANVAS_H);
          const overlay = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
          overlay.addColorStop(0, "rgba(12,12,36,0.72)");
          overlay.addColorStop(0.45, "rgba(12,12,36,0.32)");
          overlay.addColorStop(1, "rgba(8,8,26,0.86)");
          ctx.fillStyle = overlay;
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        } else {
          const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
          bgGrad.addColorStop(0, "#eef5ff");
          bgGrad.addColorStop(1, "#dfe0ff");
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          drawBlob(ctx, CANVAS_W * 0.15, CANVAS_H * 0.1, 260, BRAND, 0.16);
          drawBlob(ctx, CANVAS_W * 0.85, CANVAS_H * 0.82, 300, ACCENT, 0.16);
        }

        const textColor = hasPhoto ? "#ffffff" : BRAND_DARK;
        ctx.textAlign = "center";

        // Wordmark
        ctx.fillStyle = hasPhoto ? "#ffffff" : BRAND;
        ctx.font = `800 40px ${FONT}`;
        ctx.fillText("uVote", CANVAS_W / 2, 110);
        ctx.font = `600 20px ${FONT}`;
        ctx.fillStyle = hasPhoto ? "rgba(255,255,255,0.85)" : "#5b5e85";
        ctx.fillText("THE PAY-PER-VOTE FUNDRAISING PLATFORM", CANVAS_W / 2, 148);

        // Cover emoji badge (only when there's no photo to show instead)
        if (!hasPhoto && coverEmoji) {
          ctx.font = `160px ${FONT}`;
          ctx.fillText(coverEmoji, CANVAS_W / 2, 430);
        }

        // Event title
        ctx.fillStyle = textColor;
        ctx.font = `800 70px ${FONT}`;
        const titleY = hasPhoto ? 520 : 560;
        wrapCenteredText(ctx, title, CANVAS_W / 2, titleY, CANVAS_W - 140, 80);

        // Price pill
        const priceText = `GHS ${pricePerVote} / VOTE`;
        ctx.font = `700 30px ${FONT}`;
        const pillW = ctx.measureText(priceText).width + 76;
        const pillH = 60;
        const pillY = titleY + 130;
        drawRoundedRect(ctx, CANVAS_W / 2 - pillW / 2, pillY, pillW, pillH, pillH / 2);
        ctx.fillStyle = ACCENT;
        ctx.fill();
        ctx.fillStyle = "#241703";
        ctx.textBaseline = "middle";
        ctx.fillText(priceText, CANVAS_W / 2, pillY + pillH / 2 + 2);
        ctx.textBaseline = "alphabetic";

        // Tagline
        ctx.font = `700 32px ${FONT}`;
        ctx.fillStyle = textColor;
        ctx.fillText("Vote now — every vote counts!", CANVAS_W / 2, pillY + pillH + 66);

        // Small QR code, bottom of the flier
        const qrCanvas = document.createElement("canvas");
        await QRCode.toCanvas(qrCanvas, url, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: QR_SIZE,
          color: { dark: BRAND_DARK, light: "#ffffff" },
        });
        if (cancelled) return;
        const qrX = CANVAS_W / 2 - QR_SIZE / 2;
        const qrY = CANVAS_H - QR_SIZE - 170;
        const pad = 18;
        drawRoundedRect(ctx, qrX - pad, qrY - pad, QR_SIZE + pad * 2, QR_SIZE + pad * 2, 22);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 22;
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
        ctx.drawImage(qrCanvas, qrX, qrY, QR_SIZE, QR_SIZE);

        // Caption + site name under the QR code
        ctx.font = `600 24px ${FONT}`;
        ctx.fillStyle = textColor;
        ctx.fillText("Scan to vote", CANVAS_W / 2, qrY + QR_SIZE + pad + 46);
        ctx.font = `800 28px ${FONT}`;
        ctx.fillStyle = hasPhoto ? "#ffffff" : BRAND;
        ctx.fillText(SITE_LABEL, CANVAS_W / 2, qrY + QR_SIZE + pad + 86);

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError("Couldn't generate the flier — please try again.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [url, title, pricePerVote, coverEmoji, coverImageUrl]);

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

function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

// Word-wraps `text` into centered lines within `maxWidth`. Caps at 3 lines
// so an unusually long event title can't push the QR code off the canvas —
// a 4th+ line gets folded into an ellipsized 3rd line instead.
function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
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

  const maxLines = 3;
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = shown[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    shown[maxLines - 1] = `${last}…`;
  }

  const startY = y - ((shown.length - 1) * lineHeight) / 2;
  shown.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight));
}
