"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      router.push("/dashboard/organizer");
      router.refresh();
    } finally {
      setLoading(false);
    }
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
        <Field label="Your full name">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Ama Boateng" className="input" />
        </Field>
        <Field label="Organization name">
          <input required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="e.g. Grace Community Church, CS Department, Rotary Club" className="input" />
        </Field>
        <Field label="Email address">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="amaboateng@gmail.com" className="input" />
        </Field>
        <Field label="Password" last>
          <input type="password" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
            className="input" />
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
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "mb-5" : "mb-4"}>
      <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
