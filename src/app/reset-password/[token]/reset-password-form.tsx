x"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 w-full max-w-sm text-center">
        <div className="text-3xl mb-4">✅</div>
        <h1 className="text-xl font-extrabold mb-2">Password updated</h1>
        <p className="text-sm text-ink-dim leading-relaxed">
          Taking you to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-7 w-full max-w-sm">
      <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
        New password
      </label>
      <PasswordInput
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        required
        minLength={8}
        autoFocus
        className="mb-5"
        inputClassName="w-full rounded-xl border border-border-strong bg-background px-4 py-3 text-sm outline-none focus:border-brand"
      />
      {error && <p className="text-critical text-sm mb-4">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Updating…" : "Set new password →"}
      </button>
      <p className="text-center text-sm text-ink-dim mt-6 pt-5 border-t border-border">
        Remembered it after all?{" "}
        <Link href="/login" className="text-brand font-bold">
          Sign in here
        </Link>
      </p>
    </form>
  );
}
