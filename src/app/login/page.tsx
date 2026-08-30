"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Which required fields were empty on the last submit attempt — drives
  // the red-border treatment so a missed field is obvious at a glance
  // instead of relying on the browser's own validation tooltip.
  const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus("idle");

    const missing = { email: !email.trim(), password: !password };
    setFieldErrors(missing);
    if (missing.email || missing.password) {
      setError("Fill in the highlighted field before signing in.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        if (json.code === "email_not_verified") setNeedsVerification(true);
        return;
      }
      const role = json.user.role;
      router.push(role === "platform_admin" ? "/dashboard/admin" : "/dashboard/organizer");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setResendStatus("sending");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 py-16">
      <div className="mb-6">
        <Logo />
      </div>
      <h1 className="text-2xl font-extrabold mb-1">Welcome back</h1>
      <p className="text-ink-dim text-sm mb-7">Sign in to your dashboard</p>

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
            if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: false }));
          }}
          placeholder="you@gmail.com"
          className={`w-full rounded-xl border border-border-strong bg-background px-4 py-3 text-sm mb-4 outline-none focus:border-brand${
            fieldErrors.email ? " input-error" : ""
          }`}
        />
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase">
            Password
          </label>
          <Link href="/forgot-password" className="text-[11px] font-bold text-brand">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: false }));
          }}
          placeholder="••••••••"
          required
          error={fieldErrors.password}
          className="mb-5"
          inputClassName="w-full rounded-xl border border-border-strong bg-background px-4 py-3 text-sm outline-none focus:border-brand"
        />
        {error && <p className="text-critical text-sm mb-2">{error}</p>}
        {needsVerification && (
          <div className="mb-4">
            {resendStatus === "sent" ? (
              <p className="text-sm text-good font-bold">Verification email sent — check your inbox.</p>
            ) : (
              <button
                type="button"
                onClick={onResend}
                disabled={resendStatus === "sending"}
                className="text-sm text-brand font-bold"
              >
                {resendStatus === "sending" ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Signing in…" : "Sign In →"}
        </button>
        <p className="text-center text-sm text-ink-dim mt-6 pt-5 border-t border-border">
          New here?{" "}
          <Link href="/register" className="text-brand font-bold">
            Register your organization
          </Link>
        </p>
      </form>
    </main>
  );
}
