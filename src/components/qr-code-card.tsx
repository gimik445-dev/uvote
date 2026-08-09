"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// "H" tolerates roughly 30% of the code being damaged or obscured and
// still scans — required here because we draw the uVote logo over the
// middle of the code afterward. Anything lower and the logo overlay risks
// making the code unreadable to some phone cameras.
const ERROR_CORRECTION_LEVEL = "H";
const LOGO_SRC = "/logo.png";
// Logo stays well inside the ~30% level-H can tolerate, with margin to
// spare for real-world scanning conditions (low light, an angled phone).
const LOGO_SIZE_RATIO = 0.22;
// brand-dark rather than the lighter brand indigo — darker modules read
// more reliably against white in the mixed lighting a printed flyer or a
// phone screen at an event actually gets scanned under.
const QR_DARK_COLOR = "#1e1b6e";

/**
 * A QR code for `url` with the uVote mark embedded in the center.
 * Clicking it opens the link directly; scanning it with a phone camera
 * opens the same link, since the code encodes the URL itself.
 */
export function QrCodeCard({
  url,
  size = 240,
  label,
}: {
  url: string;
  size?: number;
  label?: string;
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

    QRCode.toCanvas(canvas, url, {
      errorCorrectionLevel: ERROR_CORRECTION_LEVEL,
      margin: 2,
      width: size,
      color: { dark: QR_DARK_COLOR, light: "#ffffff" },
    })
      .then(() => {
        if (cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setReady(true);
          return;
        }
        const logo = new Image();
        logo.onload = () => {
          if (cancelled) return;
          const logoSize = size * LOGO_SIZE_RATIO;
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          const pad = logoSize * 0.16;

          // White rounded backdrop first, so the logo reads as a clean
          // badge instead of blending into the QR modules underneath it.
          drawRoundedRect(ctx, x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, (logoSize + pad * 2) * 0.22);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.save();
          drawRoundedRect(ctx, x, y, logoSize, logoSize, logoSize * 0.22);
          ctx.clip();
          ctx.drawImage(logo, x, y, logoSize, logoSize);
          ctx.restore();
          setReady(true);
        };
        logo.onerror = () => {
          // The QR code itself already rendered and is fully scannable —
          // a missing logo asset shouldn't block the feature, just skip
          // the branding.
          if (!cancelled) setReady(true);
        };
        logo.src = LOGO_SRC;
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't generate the QR code — please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [url, size]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "uvote-qr-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function openLink() {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={openLink}
        disabled={!ready}
        className="rounded-2xl border border-border-strong p-3 bg-white disabled:opacity-50 transition hover:border-brand"
        title="Open the voting link"
        aria-label="Open the voting link"
      >
        <canvas ref={canvasRef} width={size} height={size} className="block" />
      </button>

      {error ? (
        <p className="text-critical text-xs text-center max-w-[240px]">{error}</p>
      ) : (
        <p className="text-xs text-ink-mute text-center max-w-[240px]">
          {label ?? "Scan with a phone camera to open, or click the code"}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={download} disabled={!ready} className="btn btn-ghost btn-sm">
          Download
        </button>
        <button type="button" onClick={openLink} disabled={!ready} className="btn btn-ghost btn-sm">
          Open link
        </button>
      </div>
    </div>
  );
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
