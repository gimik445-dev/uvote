"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// How long the "Resend code" button stays disabled after a code is sent.
// Delivery on our SMS route commonly takes a few minutes, so this is set
// close to that rather than a snappy "instant SMS" assumption — long enough
// that most people's first text has a real chance to land before they can
// fire off a second one (each resend costs real SMS credit, and the old
// code stays valid too — see the /api/voter/otp/verify route — so a resend
// is never wasted, just ideally not the first move).
const RESEND_COOLDOWN_SECONDS = 60;

// After this long on the code screen with no code entered, we show a
// reassurance message so people don't assume the text got lost and bail.
const SLOW_DELIVERY_HINT_SECONDS = 45;

export function VoterLoginClient() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSlowHint, setShowSlowHint] = useState(false);
  // Only ever populated in test mode (no SMS provider configured yet) so
  // the flow can still be completed end-to-end without a real text — see
  // src/lib/sms.ts.
  const [devCode, setDevCode] = useState<string | null>(null);

  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startSlowDeliveryHint() {
    if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
    setShowSlowHint(false);
    slowHintTimer.current = setTimeout(() => setShowSlowHint(true), SLOW_DELIVERY_HINT_SECONDS * 1000);
  }

  function startResendCooldown() {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
      if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
    };
  }, []);

  async function sendCode() {
    const res = await fetch("/api/voter/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Something went wrong.");
    }
    setDevCode(json.testMode ? json.devCode : null);
    return json.testMode as boolean;
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const testMode = await sendCode();
      setInfo(
        testMode
          ? "Test mode — no SMS account connected yet, so here's your code directly:"
          : "We texted you a 6-digit code. It can take a few minutes to arrive — hang tight."
      );
      setStep("code");
      startResendCooldown();
      if (!testMode) startSlowDeliveryHint();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (resendCooldown > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      const testMode = await sendCode();
      setInfo(
        testMode
          ? "New code — no SMS account connected yet, so here's your code directly:"
          : "Sent a new code. If your first text still shows up, that one still works too — use whichever arrives first."
      );
      startResendCooldown();
      if (!testMode) startSlowDeliveryHint();
      else setShowSlowHint(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/voter/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      router.push("/voter/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={requestCode} className="space-y-3">
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="024 000 0000"
          className="input w-full"
          autoFocus
        />
        {error && <p className="text-critical text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary btn-sm w-full">
          {loading ? "Sending…" : "Send me a code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-3">
      {info && <p className="text-xs text-ink-mute text-center">{info}</p>}
      {showSlowHint && !devCode && (
        <p className="text-xs text-ink-mute text-center">
          Still nothing? Texts on some networks take a few minutes — worth waiting a bit longer
          before resending.
        </p>
      )}
      {devCode && (
        <p className="text-center font-mono text-lg font-extrabold tracking-widest">{devCode}</p>
      )}
      <input
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        inputMode="numeric"
        className="input w-full text-center tracking-widest"
        autoFocus
      />
      {error && <p className="text-critical text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary btn-sm w-full">
        {loading ? "Checking…" : "Log in"}
      </button>
      <button
        type="button"
        onClick={resendCode}
        disabled={resendCooldown > 0 || resending}
        className="text-xs text-ink-mute w-full text-center disabled:opacity-60"
      >
        {resending
          ? "Resending…"
          : resendCooldown > 0
            ? `Didn't get it? Resend code in ${resendCooldown}s`
            : "Didn't get it? Resend code"}
      </button>
      <button
        type="button"
        onClick={() => {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
          setShowSlowHint(false);
          setResendCooldown(0);
          setStep("phone");
          setCode("");
          setError(null);
        }}
        className="text-xs text-ink-mute w-full text-center"
      >
        Use a different number
      </button>
    </form>
  );
}
