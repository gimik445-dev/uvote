"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailMissing, setEmailMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setEmailMissing(true);
      setError("Enter your email address before continuing.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      // Same response either way, on purpose — see the route's comment on
      // why it never reveals whether the address has an account.
      setSentTo(email);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <div className="mb-6">
          <Logo />
        </div>
        <div className="card p-8 w-full max-w-sm text-center">
          <div className="text-3xl mb-4">📩</div>
          <h1 className="text-xl font-extrabold mb-2">Check your email</h1>
          <p className="text-sm text-ink-dim leading-relaxed">
            If there&apos;s an account for <span className="font-bold text-ink">{sentTo}</span>,
            we&apos;ve sent a link to reset the password. It expires in an hour.
          </p>
          <p className="text-xs text-ink-mute mt-5">
            Didn&apos;t get it? Check spam, or{" "}
            <Link href="/login" className="text-brand font-bold">back to sign in</Link>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 py-16">
      <div className="mb-6">
        <Logo />
      </div>
      <h1 className="text-2xl font-extrabold mb-1">Forgot your password?</h1>
      <p className="text-ink-dim text-sm mb-7 text-center max-w-xs">
        Enter the email on your account and we&apos;ll send you a link to set a new password.
      </p>

      <form onSubmit={onSubmit} className="card p-7 w-full max-w-sm">
        <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailMissing) setEmailMissing(false);
          }}
          placeholder="you@gmail.com"
          autoFocus
          className={`w-full rounded-xl border border-border-strong bg-background px-4 py-3 text-sm mb-5 outline-none focus:border-brand${
            emailMissing ? " input-error" : ""
          }`}
        />
        {error && <p className="text-critical text-sm mb-4">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Sending…" : "Send reset link →"}
        </button>
        <p className="text-center text-sm text-ink-dim mt-6 pt-5 border-t border-border">
          Remembered it after all?{" "}
          <Link href="/login" className="text-brand font-bold">
            Sign in here
          </Link>
        </p>
      </form>
    </main>
  );
}
