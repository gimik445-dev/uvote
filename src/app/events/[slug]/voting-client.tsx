"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// Deliberately no voteCount here — voters never see how many votes a
// nominee has, not even their own running tally. The server never sends
// this field down to this page (see getEventBySlug in src/lib/data.ts).
type Nominee = {
  id: string;
  displayName: string;
  subtitle: string | null;
  photoUrl: string | null;
};

type Category = {
  id: string;
  name: string;
  nominees: Nominee[];
};

type EventData = {
  slug: string;
  currency: string;
  pricePerVote: string;
  categories: Category[];
};

const VOTE_PACKS = [5, 20, 50];

function initials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 1)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// A flier-style photo when the organizer has uploaded one; otherwise a
// clean initials placeholder so cards never look broken.
function NomineePhoto({ nominee }: { nominee: Nominee }) {
  if (nominee.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- nominee photos
    // are organizer-uploaded, arbitrary-origin images not known at build time.
    return (
      <img
        src={nominee.photoUrl}
        alt={nominee.displayName}
        className="w-full aspect-[4/5] object-cover"
      />
    );
  }
  return (
    <div className="w-full aspect-[4/5] bg-gradient-to-br from-brand/15 to-accent/15 flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center font-extrabold text-lg">
        {initials(nominee.displayName)}
      </div>
    </div>
  );
}

export function EventVotingClient({ event }: { event: EventData }) {
  const [activeCategoryId, setActiveCategoryId] = useState(event.categories[0]?.id);
  const [modalNominee, setModalNominee] = useState<Nominee | null>(null);
  const searchParams = useSearchParams();
  const voteOutcome = searchParams.get("vote");
  // Lets a nominee's flier QR code (?nominee=<id>) jump straight to that
  // nominee's vote modal instead of leaving the visitor to find them among
  // however many other nominees are on the page.
  const nomineeParam = searchParams.get("nominee");

  useEffect(() => {
    if (!nomineeParam) return;
    for (const c of event.categories) {
      const match = c.nominees.find((n) => n.id === nomineeParam);
      if (match) {
        setActiveCategoryId(c.id);
        setModalNominee(match);
        break;
      }
    }
    // Only ever act on the URL param that was present on load — deliberately
    // not re-running this if event.categories were to change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomineeParam]);

  const activeCategory = event.categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {voteOutcome === "success" && (
        <Banner tone="good">🎉 Thank you — your vote has been counted!</Banner>
      )}
      {voteOutcome === "failed" && (
        <Banner tone="critical">Payment didn&apos;t go through, so no votes were counted. Please try again.</Banner>
      )}

      <div className="flex gap-2.5 overflow-x-auto pb-1 mb-7">
        {event.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategoryId(c.id)}
            className={`shrink-0 px-4.5 py-2.5 rounded-full text-sm font-bold border ${
              c.id === activeCategoryId
                ? "bg-brand text-white border-brand"
                : "bg-surface text-ink-dim border-border-strong"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {activeCategory && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {activeCategory.nominees.map((n) => (
            <div key={n.id} className="card overflow-hidden text-center">
              <NomineePhoto nominee={n} />
              <div className="p-5 pt-4">
                <h4 className="font-bold text-[15px]">{n.displayName}</h4>
                {n.subtitle && <div className="text-xs text-ink-mute mb-4">{n.subtitle}</div>}
                <button onClick={() => setModalNominee(n)} className="btn btn-primary btn-sm w-full">
                  Vote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalNominee && (
        <VoteModal
          nominee={modalNominee}
          event={event}
          categoryName={activeCategory?.name ?? ""}
          onClose={() => setModalNominee(null)}
        />
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: "good" | "critical"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-xl px-5 py-3.5 mb-6 text-sm font-semibold ${
        tone === "good" ? "bg-good-bg text-good" : "bg-critical-bg text-critical"
      }`}
    >
      {children}
    </div>
  );
}

function VoteModal({
  nominee,
  event,
  categoryName,
  onClose,
}: {
  nominee: Nominee;
  event: EventData;
  categoryName: string;
  onClose: () => void;
}) {
  const [packVotes, setPackVotes] = useState(VOTE_PACKS[1]);
  const [customVotes, setCustomVotes] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"mtn_momo" | "telecel_cash" | "card">("mtn_momo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the voter closes this modal while checkout is still in flight, the
  // fetch must not be allowed to land afterward and redirect them to
  // Paystack anyway — that's a payment they never confirmed they still
  // wanted. Aborting on unmount, and ignoring the resulting AbortError,
  // makes "close" actually cancel the checkout rather than just hiding it.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const votes = customVotes ? Math.max(1, parseInt(customVotes) || 0) : packVotes;
  const total = (votes * Number(event.pricePerVote)).toFixed(2);

  async function submit() {
    setError(null);
    if (channel !== "card" && phone.trim().length < 6) {
      setError("Please enter the mobile money number to pay from.");
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/events/${event.slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomineeId: nominee.id, voteCount: votes, phone }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong starting checkout.");
        setLoading(false);
        return;
      }
      window.location.href = json.authorizationUrl;
    } catch (err) {
      // Modal was closed mid-request — the voter already backed out, so
      // silently drop this rather than showing an error or navigating.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[900] flex items-center justify-center p-5" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-border-strong text-ink-dim text-sm">✕</button>
        <div className="flex items-center gap-3 mb-6">
          {nominee.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nominee.photoUrl} alt={nominee.displayName} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-extrabold">
              {initials(nominee.displayName)}
            </div>
          )}
          <div>
            <div className="font-bold">{nominee.displayName}</div>
            <div className="text-xs text-ink-mute">{categoryName}</div>
          </div>
        </div>

        <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
          Choose a vote pack
        </label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {VOTE_PACKS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPackVotes(p);
                setCustomVotes("");
              }}
              className={`rounded-xl border py-3 text-center text-xs font-bold ${
                !customVotes && packVotes === p
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border-strong text-ink-dim"
              }`}
            >
              <div className="text-base">{p}</div>
              <div className="text-ink-mute font-semibold">
                {event.currency} {(p * Number(event.pricePerVote)).toFixed(0)}
              </div>
            </button>
          ))}
        </div>
        <input
          value={customVotes}
          onChange={(e) => setCustomVotes(e.target.value.replace(/\D/g, ""))}
          placeholder="Or enter a custom number of votes"
          className="w-full rounded-xl border border-border-strong bg-background px-4 py-2.5 text-sm mb-5 outline-none focus:border-brand"
        />

        <label className="block text-[11px] font-extrabold tracking-wide text-ink-mute uppercase mb-2">
          Pay with
        </label>
        <div className="flex gap-2 mb-4">
          {[
            { key: "mtn_momo", label: "MTN MoMo" },
            { key: "telecel_cash", label: "Telecel Cash" },
            { key: "card", label: "Card" },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setChannel(c.key as typeof channel)}
              className={`flex-1 rounded-xl border py-2.5 text-xs font-bold ${
                channel === c.key ? "border-brand bg-brand/10 text-brand" : "border-border-strong text-ink-dim"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {channel !== "card" && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="024 000 0000"
            className="w-full rounded-xl border border-border-strong bg-background px-4 py-2.5 text-sm mb-4 outline-none focus:border-brand"
          />
        )}

        <div className="flex items-center justify-between my-4">
          <span className="text-ink-dim text-sm">Total</span>
          <b className="text-xl">{event.currency} {total}</b>
        </div>

        {error && <p className="text-critical text-sm mb-3">{error}</p>}

        <button onClick={submit} disabled={loading} className="btn btn-primary w-full">
          {loading ? "Starting checkout…" : "Pay & Vote →"}
        </button>
        <p className="text-center text-[11px] text-ink-mute mt-3.5">
          🔒 Payments secured &amp; encrypted · powered by Paystack
        </p>
      </div>
    </div>
  );
}
