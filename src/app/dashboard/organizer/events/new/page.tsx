"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ORGANIZER_LINKS } from "@/components/organizer-nav-links";

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverEmoji, setCoverEmoji] = useState("🏆");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [ussdCode, setUssdCode] = useState("");
  const [pricePerVote, setPricePerVote] = useState("1.00");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("Cover photo is too large — please use an image under 1.5MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setCoverImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          coverEmoji: coverEmoji || undefined,
          coverImageUrl: coverImageUrl || undefined,
          ussdCode: ussdCode || undefined,
          pricePerVote: Number(pricePerVote),
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      router.push(`/dashboard/organizer/events/${json.event.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell
      activeLabel="Events"
      links={ORGANIZER_LINKS}
      identityLabel="Organizer"
      roleLabel="Organizer account"
    >
      <div className="mb-6">
        <Link href="/dashboard/organizer" className="text-sm text-ink-dim font-semibold">
          ← Back to overview
        </Link>
        <h1 className="text-2xl font-extrabold mt-2">Create a new event</h1>
        <p className="text-ink-dim text-sm mt-1">
          It starts as a draft — add categories and nominees, then switch it to Active when
          you&apos;re ready for voting to open.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card p-7 max-w-xl">
        <Field label="Event title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Excellence Awards Night '26"
            className="input"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Honoring the people who made this year outstanding."
            rows={3}
            className="input resize-none"
          />
        </Field>
        <Field label="Event cover photo (optional)">
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={onCoverChange} className="text-xs" />
            {coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="Cover preview" className="w-16 h-10 rounded-lg object-cover" />
            )}
          </div>
          <p className="text-xs text-ink-mute mt-1.5">
            Used as the background banner on nominees&apos; private results page.
          </p>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cover emoji">
            <input
              value={coverEmoji}
              onChange={(e) => setCoverEmoji(e.target.value)}
              placeholder="🏆"
              maxLength={8}
              className="input"
            />
          </Field>
          <Field label="USSD code (optional)">
            <input
              value={ussdCode}
              onChange={(e) => setUssdCode(e.target.value)}
              placeholder="*920*11#"
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price per vote (GHS)">
            <input
              type="number"
              min={0.1}
              step={0.1}
              required
              value={pricePerVote}
              onChange={(e) => setPricePerVote(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Ends on (optional)">
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        {error && <p className="text-critical text-sm mb-4">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
          {loading ? "Creating…" : "Create event →"}
        </button>
      </form>
    </DashboardShell>
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
