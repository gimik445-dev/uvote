"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Tracks which required fields were empty (or, for password, too short)
  // on the last submit attempt — drives the red-border highlight so a
  // skipped field is obvious instead of relying on the browser's own
  // validation tooltip.
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: boolean;
    organizationName?: boolean;
    email?: boolean;
    password?: boolean;
  }>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing = {
      fullName: !fullName.trim(),
      organizationName: !organizationName.trim(),
      email: !email.trim(),
      password: password.length < 8,
    };
    setFieldErrors(missing);
    if (Object.values(missing).some(Boolean)) {
      setError("Fill in the highlighted field(s) before continuing.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          organizationName,
          email,
          password,
          accountType: "organizer",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setSentTo(json.email ?? email);
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
            We sent a verification link to <span className="font-bold text-ink">{sentTo}</span>.
            Click it to confirm your address and finish setting up your account.
          </p>
          <p className="text-xs text-ink-mute mt-5">
            Didn&apos;t get it? Check spam, or{" "}
            <Link href="/login" className="text-brand font-bold">try signing in</Link>{" "}
            once you&apos;ve verified.
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
      <h1 className="text-2xl font-extrabold mb-1">Register your organization</h1>
      <p className="text-ink-dim text-sm mb-7 text-center max-w-xs">
        Create an organizer account to run paid voting events for your school, church,
        club or community group.
      </p>

      <form onSubmit={onSubmit} className="card p-7 w-full max-w-sm">
        <Field label="Your full name" error={fieldErrors.fullName ? "Enter your name." : undefined}>
          <input
            required
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) setFieldErrors((f) => ({ ...f, fullName: false }));
            }}
            placeholder="Ama Boateng"
            className={`input${fieldErrors.fullName ? " input-error" : ""}`}
          />
        </Field>
        <Field
          label="Organization name"
          error={fieldErrors.organizationName ? "Enter your organization's name." : undefined}
        >
          <input
            required
            value={organizationName}
            onChange={(e) => {
              setOrganizationName(e.target.value);
              if (fieldErrors.organizationName) setFieldErrors((f) => ({ ...f, organizationName: false }));
            }}
            placeholder="e.g. Grace Community Church, CS Department, Rotary Club"
            className={`input${fieldErrors.organizationName ? " input-error" : ""}`}
          />
        </Field>
        <Field label="Email address" error={fieldErrors.email ? "Enter your email address." : undefined}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: false }));
            }}
            placeholder="amaboateng@gmail.com"
            className={`input${fieldErrors.email ? " input-error" : ""}`}
          />
        </Field>
        <Field
          label="Password"
          last
          error={fieldErrors.password ? "Password must be at least 8 characters." : undefined}
        >
          <PasswordInput
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: false }));
            }}
            placeholder="At least 8 characters"
            required
            minLength={8}
            error={fieldErrors.password}
            inputClassName="input"
          />
        </Field>
        {error && <p className="text-critical text-sm mb-4">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Creating account…" : "Get Started →"}
        </button>
        <p className="text-center text-sm text-ink-dim mt-6 pt-5 border-t border-border">
          Already have an account?{" "}
          <Link href="/login" className="text-brand font-bold">Sign in here</Link>
        </p>
      </form>
    </main>
  );
}

function Field({
  label,
  children,
  last,
  error,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  error?: string;
}) {
  return (
    <div className={last ? "mb-5" : "mb-4"}>
      <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
        {label}
      </label>
      {children}
      {error && <p className="text-critical text-xs mt-1.5 font-semibold">{error}</p>}
    </div>
  );
}
