"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// How long the "Resend code" button stays disabled after a code is sent.
// Long enough to discourage accidental double-sends (each one costs real
// SMS credit), short enough that someone whose text is just slow to arrive
// isn't stuck waiting.
const RESEND_COOLDOWN_SECONDS = 30;

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
  // Only ever populated in test mode (no SMS provider configured yet) so
  // the flow can still be completed end-to-end without a real text — see
  // src/lib/sms.ts.
  const [devCode, setDevCode] = useState<string | null>(null);

  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
          : "We texted you a 6-digit code."
      );
      setStep("code");
      startResendCooldown();
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
      setCode("");
      setInfo(
        testMode
          ? "New code — no SMS account connected yet, so here's your code directly:"
          : "Sent — a new code is on its way."
      );
      startResendCooldown();
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
