"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { getOrganizerEventDetail } from "@/lib/data";
import { FlierCard } from "@/components/flier-card";

type EventDetail = NonNullable<Awaited<ReturnType<typeof getOrganizerEventDetail>>>;

export function ManageEventClient({ event }: { event: EventDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy voting link");
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [showFlier, setShowFlier] = useState(false);
  // Computed after mount (not during render) so server- and client-side
  // markup match — window.location isn't available during SSR.
  const [votingUrl, setVotingUrl] = useState<string | null>(null);
  useEffect(() => {
    setVotingUrl(`${window.location.origin}/events/${event.slug}`);
  }, [event.slug]);

  async function setStatus(status: "draft" | "active" | "ended") {
    setBusy(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/organizer/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setStatusError(json?.error ?? "Something went wrong updating the event status.");
        return;
      }

      if (status === "active") {
        // Going active is the "you're done setting this up" moment — send
        // the organizer back to their event list instead of leaving them
        // stranded on the page they just finished with.
        router.push("/dashboard/organizer");
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      setStatusError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setCoverError("Cover photo is too large — please use an image under 1.5MB.");
      return;
    }
    setCoverError(null);
    const reader = new FileReader();
    reader.onerror = () => setCoverError("Couldn't read that photo — please try a different file.");
    reader.onload = async () => {
      setCoverUploading(true);
      try {
        const res = await fetch(`/api/organizer/events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverImageUrl: reader.result }),
        });
        if (res.ok) router.refresh();
        else setCoverError("Something went wrong uploading that photo.");
      } catch {
        setCoverError("Network error — please try again.");
      } finally {
        setCoverUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function copyLink() {
    const url = `${window.location.origin}/events/${event.slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyLabel("Copied!");
        setTimeout(() => setCopyLabel("Copy voting link"), 1800);
      })
      .catch(() => setCopyLabel("Couldn't copy — copy manually"));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <span
            className={`badge ${
              event.status === "active"
                ? "badge-good"
                : event.status === "draft"
                ? "badge-warning"
                : "badge-mute"
            } mb-2`}
          >
            {event.status}
          </span>
          <h1 className="text-2xl font-extrabold">{event.title}</h1>
          <p className="text-ink-dim text-sm mt-1">
            GHS {Number(event.pricePerVote).toFixed(2)} / vote
            {event.ussdCode ? ` · USSD ${event.ussdCode}` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyLink} className="btn btn-ghost btn-sm">
            {copyLabel}
          </button>
          <button onClick={() => setShowFlier((s) => !s)} className="btn btn-ghost btn-sm">
            {showFlier ? "Hide flier" : "Flier"}
          </button>
          {event.status !== "active" && (
            <button
              disabled={busy}
              onClick={() => setStatus("active")}
              className="btn btn-primary btn-sm"
            >
              {busy ? "Activating…" : "Set Active"}
            </button>
          )}
          {event.status === "active" && (
            <button
              disabled={busy}
              onClick={() => setStatus("ended")}
              className="btn btn-ghost btn-sm"
            >
              End Event
            </button>
          )}
          {event.status === "draft" && (
            <button
              disabled={busy}
              onClick={() => setStatus("ended")}
              className="btn btn-ghost btn-sm"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-4">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt="Event cover"
            className="w-20 h-14 rounded-lg object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-20 h-14 rounded-lg bg-background border border-border flex items-center justify-center text-xl shrink-0">
            {event.coverEmoji}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold mb-1">Cover photo</div>
          <p className="text-xs text-ink-mute mb-2">
            Shown as the background banner on nominees&apos; private results page.
          </p>
          <label className="btn btn-ghost btn-sm cursor-pointer inline-block">
            {coverUploading ? "Uploading…" : event.coverImageUrl ? "Change photo" : "Upload photo"}
            <input type="file" accept="image/*" onChange={onCoverChange} className="hidden" disabled={coverUploading} />
          </label>
          {coverError && <p className="text-critical text-xs mt-2">{coverError}</p>}
        </div>
      </div>

      {event.status === "draft" && (
        <div className="card p-4 mb-6 bg-warning-bg border-warning/30 text-warning text-sm font-semibold">
          This event is a draft — it won&apos;t be visible or open for voting until you set it
          Active.
        </div>
      )}

      {statusError && (
        <div className="card p-4 mb-6 border-l-4 border-l-critical text-sm text-critical">
          {statusError}
        </div>
      )}

      {showFlier && (
        <div className="card p-6 mb-6 flex flex-col items-center">
          <h3 className="font-bold mb-1 self-start">Event flier</h3>
          <p className="text-xs text-ink-mute mb-4 self-start">
            A ready-to-print flier with a small QR code and the uVote site name at the
            bottom — download it and post it wherever your voters will see it.
          </p>
          {votingUrl ? (
            <FlierCard
              url={votingUrl}
              kicker="The pay-per-vote fundraising platform"
              title={event.title}
              pricePerVote={Number(event.pricePerVote).toFixed(2)}
              photoUrl={event.coverImageUrl}
              fallbackEmoji={event.coverEmoji}
            />
          ) : (
            <div className="text-xs text-ink-mute py-6">Loading…</div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {event.categories.map((category) => (
          <CategoryCard key={category.id} category={category} eventId={event.id} />
        ))}
      </div>

      <AddCategoryForm eventId={event.id} />
    </div>
  );
}

function CategoryCard({
  category,
  eventId,
}: {
  category: EventDetail["categories"][number];
  eventId: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] = useState<Record<string, string>>({});

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("Photo is too large — please use an image under 1.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Couldn't read that photo — please try a different file.");
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function addNominee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/organizer/categories/${category.id}/nominees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          subtitle: subtitle || undefined,
          photoUrl: photoUrl || undefined,
          phone,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setDisplayName("");
      setSubtitle("");
      setPhone("");
      setPhotoUrl(null);
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendLink(nomineeId: string) {
    setResendState((s) => ({ ...s, [nomineeId]: "sending" }));
    try {
      const res = await fetch(`/api/organizer/nominees/${nomineeId}/resend-link`, {
        method: "POST",
      });
      const json = await res.json();
      setResendState((s) => ({
        ...s,
        [nomineeId]: res.ok ? (json.testMode ? "sent (test mode)" : "sent") : json.error ?? "failed",
      }));
    } catch {
      setResendState((s) => ({ ...s, [nomineeId]: "failed" }));
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">{category.name}</h3>
        <button onClick={() => setShowForm((s) => !s)} className="btn btn-ghost btn-sm">
          {showForm ? "Cancel" : "+ Add nominee"}
        </button>
      </div>

      {category.nominees.length === 0 && !showForm && (
        <p className="text-sm text-ink-mute py-4 text-center">No nominees yet in this category.</p>
      )}

      {category.nominees.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
          {category.nominees.map((n) => (
            <div key={n.id} className="flex items-center gap-3 border border-border rounded-xl p-3">
              {n.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={n.photoUrl}
                  alt={n.displayName}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center font-bold shrink-0">
                  {n.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{n.displayName}</div>
                <div className="text-xs text-ink-mute truncate">
                  {n.subtitle ?? " "} · {n.voteCount.toLocaleString()} votes
                </div>
                <button
                  onClick={() => resendLink(n.id)}
                  disabled={resendState[n.id] === "sending"}
                  className="text-[11px] font-bold text-brand mt-1"
                >
                  {resendState[n.id]
                    ? resendState[n.id] === "sending"
                      ? "Sending…"
                      : `📲 ${resendState[n.id]}`
                    : "Resend results link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={addNominee} className="border-t border-border pt-4 mt-3">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nominee name"
              className="input"
            />
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtitle (e.g. dept, level)"
              className="input"
            />
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nominee's phone (024 000 0000)"
              className="input sm:col-span-2"
            />
          </div>
          <p className="text-xs text-ink-mute mb-3">
            We&apos;ll text this number a one-tap link to their private results page — never shared with voters.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <label className="btn btn-ghost btn-sm cursor-pointer inline-block">
              {photoUrl ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
                className="hidden"
              />
            </label>
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Preview" className="w-9 h-9 rounded-full object-cover" />
            )}
          </div>
          {error && <p className="text-critical text-sm mb-3">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading ? "Adding…" : "Add nominee"}
          </button>
        </form>
      )}
    </div>
  );
}

function AddCategoryForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setName("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 mt-6 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
          New category
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Best Dressed"
          className="input"
        />
      </div>
      {error && <p className="text-critical text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
        {loading ? "Adding…" : "+ Add category"}
      </button>
    </form>
  );
}
