"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus("idle");
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          className="w-full rounded-xl border border-border-strong bg-background px-4 py-3 text-sm mb-4 outline-none focus:border-brand"
        />
        <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-border-strong bg-background px-4 py-3 text-sm mb-5 outline-none focus:border-brand"
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
        <p className="text-center text-xs text-ink-mute mt-4">
          Demo: organizer@uvote.app / organizer123 · admin@uvote.app / admin12345
        </p>
      </form>
    </main>
  );
}
