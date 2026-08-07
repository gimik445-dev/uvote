"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VoterLoginClient() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  // Only ever populated in test mode (no SMS provider configured yet) so
  // the flow can still be completed end-to-end without a real text — see
  // src/lib/sms.ts.
  const [devCode, setDevCode] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/voter/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setDevCode(json.testMode ? json.devCode : null);
      setInfo(
        json.testMode
          ? "Test mode — no SMS account connected yet, so here's your code directly:"
          : "We texted you a 6-digit code."
      );
      setStep("code");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
