import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEventBySlug } from "@/lib/data";
import { EventVotingClient } from "./voting-client";
import { Logo } from "@/components/logo";

export default async function EventPage({
  params,
}: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-6 pt-5">
        <Logo size="sm" />
      </div>

      <div
        className={`border-b border-border mt-4 relative ${
          event.coverImageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-brand/10 to-accent/10"
        }`}
        style={event.coverImageUrl ? { backgroundImage: `url(${event.coverImageUrl})` } : undefined}
      >
        {event.coverImageUrl && (
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/65"
            aria-hidden="true"
          />
        )}
        <div className="relative max-w-6xl mx-auto px-6 py-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="badge badge-good mb-3">{event.status === "active" ? "Active" : event.status}</span>
            <h1 className={`text-3xl font-extrabold ${event.coverImageUrl ? "text-white" : ""}`}>
              {event.title}
            </h1>
            <p className={`max-w-lg mt-2 ${event.coverImageUrl ? "text-white/80" : "text-ink-dim"}`}>
              {event.description}
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <InfoChip label="USSD Code" value={event.ussdCode ?? "—"} />
            <InfoChip
              label="Ends"
              value={event.endsAt ? new Date(event.endsAt).toLocaleDateString() : "—"}
            />
            <InfoChip label="Vote price" value={`${event.currency} ${Number(event.pricePerVote).toFixed(2)}`} />
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <EventVotingClient event={event} />
      </Suspense>
    </main>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-2.5">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-mute">{label}</div>
      <div className="font-bold text-sm mt-0.5">{value}</div>
    </div>
  );
}
