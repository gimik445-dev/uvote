"use client";

import { useEffect, useState } from "react";
import { FlierCard } from "@/components/flier-card";

export function NomineeFlierSection({
  nomineeId,
  displayName,
  subtitle,
  photoUrl,
  eventSlug,
  eventTitle,
  categoryName,
  pricePerVote,
}: {
  nomineeId: string;
  displayName: string;
  subtitle: string | null;
  photoUrl: string | null;
  eventSlug: string;
  eventTitle: string;
  categoryName: string;
  pricePerVote: string;
}) {
  const [showFlier, setShowFlier] = useState(false);
  // Computed after mount (not during render) so server- and client-side
  // markup match — window.location isn't available during SSR.
  const [votingUrl, setVotingUrl] = useState<string | null>(null);
  useEffect(() => {
    // The nominee query param takes a visitor straight to this nominee's
    // vote modal instead of leaving them to find it among every nominee on
    // the event page — see the ?nominee= handling in voting-client.tsx.
    setVotingUrl(`${window.location.origin}/events/${eventSlug}?nominee=${nomineeId}`);
  }, [eventSlug, nomineeId]);

  return (
    <div className="mt-5">
      <button onClick={() => setShowFlier((s) => !s)} className="btn btn-ghost btn-sm w-full">
        {showFlier ? "Hide flier" : "Get my flier"}
      </button>

      {showFlier && (
        <div className="card p-6 mt-4 flex flex-col items-center">
          <h3 className="font-bold mb-1 self-start">Your flier</h3>
          <p className="text-xs text-ink-mute mb-4 self-start">
            A ready-to-print flier with your photo and a small QR code that opens straight to
            voting for you — download it and share it however you like.
          </p>
          {votingUrl ? (
            <FlierCard
              url={votingUrl}
              kicker="To vote"
              title={displayName}
              subtitle={subtitle ?? `${categoryName} — ${eventTitle}`}
              pricePerVote={Number(pricePerVote).toFixed(2)}
              photoUrl={photoUrl}
              fallbackInitials={displayName.slice(0, 1).toUpperCase()}
            />
          ) : (
            <div className="text-xs text-ink-mute py-6">Loading…</div>
          )}
        </div>
      )}
    </div>
  );
}
