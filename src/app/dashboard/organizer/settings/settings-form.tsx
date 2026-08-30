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
  const [nameMissing, setNameMissing] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!name.trim()) {
      setNameMissing(true);
      setError("Enter your organization's name before saving.");
      return;
    }

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

      <Field label="Organization name" error={nameMissing ? "This field is required." : undefined}>
        <input
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameMissing) setNameMissing(false);
          }}
          className={`input${nameMissing ? " input-error" : ""}`}
        />
      </Field>

      <Field
        label="Payout mobile money number"
        // Not required to save — but flagged so it's impossible to miss:
        // without this, the admin has no way to actually send you your
        // payouts (see the admin payouts page, which shows the same
        // warning from the other side).
        error={
          !momo.trim()
            ? "Add this so the admin can pay you — payouts can't be sent without it."
            : undefined
        }
      >
        <input
          value={momo}
          onChange={(e) => setMomo(e.target.value)}
          placeholder="024 000 0000"
          className={`input${!momo.trim() ? " input-error" : ""}`}
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

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
        {label}
      </label>
      {children}
      {error && <p className="text-critical text-xs mt-1.5 font-semibold">{error}</p>}
    </div>
  );
}
