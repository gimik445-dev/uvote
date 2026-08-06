import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Guidelines — uVote" };

const SECTIONS = [
  {
    title: "For voters",
    icon: "🗳️",
    items: [
      "You never need to create an account to vote — just open the event page and pay.",
      "Each vote costs the price set by the event organizer, shown before you check out.",
      "You can vote for the same nominee as many times as you like — it's a fundraiser, not a one-person-one-vote election.",
      "Payments are processed securely via Paystack (card, MTN Mobile Money, Telecel Cash).",
      "Votes are only counted once your payment is confirmed — if a payment fails, the vote isn't recorded and you won't be charged.",
    ],
  },
  {
    title: "For organizers",
    icon: "🏛️",
    items: [
      "Only register an event that your organization — school, church, club or community group — is officially running.",
      "Set a fair price per vote — this is what your supporters will be charged per vote.",
      "Keep nominee photos and names accurate and appropriate; misleading entries may be removed.",
      "Vote counts stay private by design — only your organizer dashboard shows live totals, and voters never see a running count, not even the nominee's own.",
      "A platform commission is deducted from revenue before payout; your dashboard always shows the exact breakdown.",
    ],
  },
  {
    title: "Fair use & conduct",
    icon: "⚖️",
    items: [
      "No impersonation — don't create a nominee profile for someone without their knowledge.",
      "No manipulating payments (e.g. chargebacks after votes are counted) — accounts found doing this may be suspended.",
      "Events must be genuine organization activities — uVote is not a platform for political or national elections.",
      "Report any suspicious activity or technical issue via the Contact page.",
    ],
  },
];

export default function GuidelinesPage() {
  return (
    <main className="flex-1">
      <SiteHeader />

      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-12">
        <span className="badge badge-mute mb-6">📋 Guidelines</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mt-6 mb-6">
          Simple rules, kept <span className="text-brand">fair</span> for everyone
        </h1>
        <p className="text-lg text-ink-dim max-w-xl mx-auto">
          A short read for voters and organizers on how uVote is meant to be used.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16 flex flex-col gap-3">
        {SECTIONS.map((s, idx) => (
          <details className="faq-item card" key={s.title} open={idx === 0}>
            <summary className="faq-question">
              <span className="flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                {s.title}
              </span>
              <span className="faq-chevron">▾</span>
            </summary>
            <ul className="flex flex-col gap-3 px-6 pb-6 -mt-1">
              {s.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-dim leading-relaxed">
                  <span className="text-brand font-bold shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
