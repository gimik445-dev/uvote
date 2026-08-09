"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsForm({
  organization,
  email,
}: {
  organization: { name: string; payoutMomoNumber: string | null; isVerified: boolean };
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [momo, setMomo] = useState(organization.payoutMomoNumber ?? "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/organizer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payoutMomoNumber: momo || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-7 max-w-lg">
      <div className="mb-5">
        <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
          Account email
        </label>
        <div className="text-sm text-ink-dim">{email}</div>
      </div>

      <Field label="Organization name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </Field>

      <Field label="Payout mobile money number">
        <input
          value={momo}
          onChange={(e) => setMomo(e.target.value)}
          placeholder="024 000 0000"
          className="input"
        />
      </Field>

      <div className="flex items-center gap-2 mb-5">
        <span
          className={`badge ${organization.isVerified ? "badge-good" : "badge-warning"}`}
        >
          {organization.isVerified ? "Verified organization" : "Pending verification"}
        </span>
      </div>

      {error && <p className="text-critical text-sm mb-4">{error}</p>}
      {saved && <p className="text-good text-sm mb-4">Saved.</p>}
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
