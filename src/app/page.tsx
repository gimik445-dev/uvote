import Link from "next/link";
import { getActiveEvents } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function LandingPage() {
  const events = await getActiveEvents();

  return (
    <main className="flex-1">
      <SiteHeader />

      <section className="max-w-3xl mx-auto text-center px-6 pt-20 pb-16">
        <span className="badge badge-mute mb-6">✨ The pay-per-vote fundraising platform</span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] sm:leading-[1.05] mt-6 mb-6">
          Support your favorite <span className="text-brand">nominees</span>,<br />
          fund your community&apos;s <span className="text-accent">next event</span>
        </h1>
        <p className="text-lg text-ink-dim max-w-xl mx-auto mb-9">
          Real-time, secure pay-per-vote fundraising for awards nights, pageants and community
          events — schools, churches, clubs and more — with instant mobile money and card
          checkout, no app required.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="#events" className="btn btn-primary">Browse Live Events →</a>
          <Link href="/register" className="btn btn-ghost">Start Your Own Event</Link>
        </div>
      </section>

      <section id="events" className="max-w-6xl mx-auto px-6 pb-20">
        <span className="text-brand font-extrabold text-xs tracking-widest uppercase">Discover</span>
        <h2 className="text-3xl font-extrabold mt-2 mb-8">Live Events</h2>

        {events.length === 0 ? (
          <div className="card p-10 text-center text-ink-dim">
            No events are live right now — check back soon.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="card overflow-hidden hover:border-brand transition-colors"
              >
                <div className="h-28 bg-gradient-to-br from-brand/10 to-accent/10 flex items-start justify-between px-5 pt-4">
                  <span className="text-4xl">{event.coverEmoji}</span>
                  <span className="badge badge-good">Active</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-1.5">{event.title}</h3>
                  <p className="text-sm text-ink-dim mb-4 line-clamp-2 min-h-[40px]">
                    {event.description}
                  </p>
                  <div className="flex justify-between text-xs border-t border-border pt-3 text-ink-mute">
                    <div>
                      USSD Code
                      <div className="text-ink font-semibold mt-0.5">{event.ussdCode ?? "—"}</div>
                    </div>
                    <div>
                      By
                      <div className="text-ink font-semibold mt-0.5">{event.organization.name}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="how" className="max-w-6xl mx-auto px-6 pb-20">
        <span className="text-brand font-extrabold text-xs tracking-widest uppercase">How it works</span>
        <h2 className="text-3xl font-extrabold mt-2 mb-8">Built for any organization</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "🔢", title: "Unique event codes", body: "Every event gets its own USSD short code so anyone can vote from any phone." },
            { icon: "📈", title: "Live analytics", body: "Track votes and revenue in real time, per category, per nominee." },
            { icon: "📱", title: "Mobile money + card", body: "MTN, Telecel and card checkout built in via Paystack." },
            { icon: "🔒", title: "Verified payments only", body: "A vote is only ever counted once Paystack confirms the payment went through." },
          ].map((f) => (
            <div className="card p-6" key={f.title}>
              <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center text-xl mb-4">
                {f.icon}
              </div>
              <h4 className="font-bold mb-1.5">{f.title}</h4>
              <p className="text-sm text-ink-dim">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
