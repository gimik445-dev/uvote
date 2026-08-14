"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmojiPicker } from "@/components/emoji-picker";

// A guided, step-by-step replacement for what used to be one long form.
// Each step saves to the real event record as you go (the draft event is
// created the moment step 1 is completed) rather than holding everything
// in memory until a final submit — so nothing is lost if someone closes
// the tab partway through, and "Back" is always safe.
//
// Inspired by a competitor's event-setup wizard (a vertical step list with
// checkmarks, a live card preview, and a launch-readiness checklist) but
// built against uVote's own data model and visual language rather than
// copied wholesale — see the design writeup in conversation for why.

type Category = { id: string; name: string };

const STEPS = [
  { key: "basics", title: "Event setup", subtitle: "Title & description" },
  { key: "schedule", title: "Schedule & pricing", subtitle: "Vote price, end date" },
  { key: "media", title: "Media", subtitle: "Cover photo, emoji, USSD" },
  { key: "offer", title: "Categories", subtitle: "What people vote on" },
  { key: "review", title: "Review", subtitle: "Confirm & publish" },
] as const;

export function EventWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — identity
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — schedule & pricing
  const [pricePerVote, setPricePerVote] = useState("1.00");
  const [endsAt, setEndsAt] = useState("");

  // Step 3 — media
  const [coverEmoji, setCoverEmoji] = useState("🏆");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [ussdCode, setUssdCode] = useState("");

  // Step 4 — categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);

  const readiness = useMemo(
    () => [
      { label: "Event identity", done: title.trim().length >= 3 },
      { label: "Schedule & pricing", done: Number(pricePerVote) > 0 },
      { label: "At least one category", done: categories.length > 0 },
    ],
    [title, pricePerVote, categories.length]
  );
  const canPublish = readiness.every((r) => r.done);

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("Cover photo is too large — please use an image under 1.5MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onerror = () => setError("Couldn't read that photo — please try a different file.");
    reader.onload = () => setCoverImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveStepAndContinue() {
    setError(null);
    setLoading(true);
    try {
      if (step === 0) {
        if (title.trim().length < 3) {
          setError("Give the event a title (at least 3 characters).");
          return;
        }
        if (!eventId) {
          const res = await fetch("/api/organizer/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description: description || undefined,
              pricePerVote: Number(pricePerVote) || 1,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setError(json.error ?? "Something went wrong.");
            return;
          }
          setEventId(json.event.id);
        } else {
          const res = await fetch(`/api/organizer/events/${eventId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description: description || null }),
          });
          if (!res.ok) {
            setError("Something went wrong saving that.");
            return;
          }
        }
      } else if (step === 1 && eventId) {
        const res = await fetch(`/api/organizer/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pricePerVote: Number(pricePerVote) || 1,
            endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          }),
        });
        if (!res.ok) {
          setError("Something went wrong saving that.");
          return;
        }
      } else if (step === 2 && eventId) {
        const res = await fetch(`/api/organizer/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coverEmoji,
            coverImageUrl: coverImageUrl ?? null,
            ussdCode: ussdCode || null,
          }),
        });
        if (!res.ok) {
          setError("Something went wrong saving that.");
          return;
        }
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || newCategory.trim().length < 2) return;
    setCategoryBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't add that category.");
        return;
      }
      setCategories((c) => [...c, json.category]);
      setNewCategory("");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function removeCategory(id: string) {
    setCategories((c) => c.filter((cat) => cat.id !== id));
    try {
      await fetch(`/api/organizer/categories/${id}`, { method: "DELETE" });
    } catch {
      // Nothing actionable if this fails silently — worst case the
      // category reappears on the manage page and they remove it there.
    }
  }

  async function finish(publish: boolean) {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      if (publish) {
        const res = await fetch(`/api/organizer/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
        if (!res.ok) {
          setError("Couldn't publish this event — please try again.");
          return;
        }
        router.push("/dashboard/organizer");
      } else {
        router.push(`/dashboard/organizer/events/${eventId}`);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[220px_1fr_300px] gap-6 items-start">
      {/* Stepper */}
      <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            disabled={i > step}
            onClick={() => i < step && setStep(i)}
            className={`text-left shrink-0 lg:shrink flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
              i === step
                ? "border-brand bg-brand/5"
                : i < step
                ? "border-border hover:bg-background cursor-pointer"
                : "border-transparent opacity-50"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                i < step
                  ? "bg-brand text-white"
                  : i === step
                  ? "bg-brand/15 text-brand"
                  : "bg-background text-ink-mute border border-border"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className="min-w-[110px]">
              <div className="text-sm font-bold leading-tight">{s.title}</div>
              <div className="text-[11px] text-ink-mute leading-tight">{s.subtitle}</div>
            </span>
          </button>
        ))}
      </nav>

      {/* Step body */}
      <div className="card p-6 min-w-0">
        <div className="text-[11px] font-extrabold tracking-widest uppercase text-brand mb-1">
          Step {step + 1} / {STEPS.length}
        </div>
        <h2 className="text-xl font-extrabold mb-5">{STEPS[step].title}</h2>

        {step === 0 && (
          <div>
            <Field label="Event title">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Excellence Awards Night '26"
                className="input"
                autoFocus
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
              <p className="text-xs text-ink-mute mt-1.5">
                The first line shows up on the event card, so write it like an announcement
                supporters would recognize immediately.
              </p>
            </Field>
          </div>
        )}

        {step === 1 && (
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
            <Field label="Voting ends (optional)">
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="input"
              />
              <p className="text-xs text-ink-mute mt-1.5">
                Leave blank to keep voting open until you end it manually.
              </p>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div>
            <Field label="Cover photo (optional)">
              <div className="flex items-center gap-3">
                <label className="btn btn-ghost btn-sm cursor-pointer inline-block">
                  {coverImageUrl ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onCoverChange}
                    className="hidden"
                  />
                </label>
                {coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-16 h-10 rounded-lg object-cover"
                  />
                )}
              </div>
            </Field>
            <Field label="Cover emoji">
              <EmojiPicker value={coverEmoji} onChange={setCoverEmoji} />
              <p className="text-xs text-ink-mute mt-1.5">Used when there&apos;s no cover photo.</p>
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
        )}

        {step === 3 && (
          <div>
            <form onSubmit={addCategory} className="flex gap-2 mb-4">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Best Dressed, Most Influential"
                className="input"
              />
              <button
                type="submit"
                disabled={categoryBusy || newCategory.trim().length < 2}
                className="btn btn-primary btn-sm shrink-0"
              >
                Add
              </button>
            </form>
            {categories.length === 0 ? (
              <p className="text-sm text-ink-mute py-6 text-center">
                No categories yet — add at least one to open voting.
              </p>
            ) : (
              <ul className="space-y-2">
                {categories.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border"
                  >
                    <span className="text-sm font-semibold">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCategory(c.id)}
                      className="text-xs text-critical font-bold"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-ink-mute mt-4">
              Add nominees to each category from the event page after you finish here.
            </p>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="space-y-2 mb-6">
              {readiness.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border"
                >
                  <span className="text-sm font-semibold">{r.label}</span>
                  <span className={`badge ${r.done ? "badge-good" : "badge-warning"}`}>
                    {r.done ? "Ready" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
            {!canPublish && (
              <p className="text-sm text-warning mb-4">
                Finish the pending items above before publishing — or save as a draft and come
                back later.
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => finish(false)}
                className="btn btn-ghost flex-1"
              >
                Save as draft
              </button>
              <button
                type="button"
                disabled={loading || !canPublish}
                onClick={() => finish(true)}
                className="btn btn-primary flex-1"
              >
                {loading ? "Publishing…" : "Publish — go live →"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-critical text-sm mt-4">{error}</p>}

        {step < 4 && (
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-border">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="btn btn-ghost btn-sm"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={saveStepAndContinue}
              disabled={loading}
              className="btn btn-primary btn-sm"
            >
              {loading ? "Saving…" : "Continue →"}
            </button>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-6">
        <div className="text-[11px] font-extrabold tracking-widest uppercase text-ink-mute mb-2">
          Live preview
        </div>
        <div className="card overflow-hidden">
          <div
            className={`h-28 flex items-start justify-between px-5 pt-4 relative ${
              coverImageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-brand/10 to-accent/10"
            }`}
            style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : undefined}
          >
            {coverImageUrl && (
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/45"
                aria-hidden="true"
              />
            )}
            {!coverImageUrl && <span className="text-4xl">{coverEmoji}</span>}
            <span className="badge badge-warning relative ml-auto">Draft</span>
          </div>
          <div className="p-5">
            <h3 className="font-bold mb-1.5">{title || "Your event name"}</h3>
            <p className="text-sm text-ink-dim mb-4 line-clamp-2 min-h-[40px]">
              {description || "A short summary will appear here."}
            </p>
            <div className="flex justify-between text-xs border-t border-border pt-3 text-ink-mute">
              <div>
                USSD Code
                <div className="text-ink font-semibold mt-0.5">{ussdCode || "—"}</div>
              </div>
              <div>
                Price / vote
                <div className="text-ink font-semibold mt-0.5">
                  GHS {Number(pricePerVote || 0).toFixed(2)}
                </div>
              </div>
              <div>
                Categories
                <div className="text-ink font-semibold mt-0.5">{categories.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
