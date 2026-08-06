import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "FAQ — uVote" };

const FAQS = [
  {
    q: "Do I need to create an account to vote?",
    a: "No. Voting never requires an account, login or app download. Just open the event page, choose a nominee, pick how many votes to buy, and pay.",
  },
  {
    q: "Can I vote more than once for the same nominee?",
    a: "Yes — uVote is a pay-per-vote fundraiser, not a one-person-one-vote election. You can support your favorite nominee as many times as you'd like.",
  },
  {
    q: "How do I pay?",
    a: "Checkout is handled by Paystack and supports card payments, MTN Mobile Money and Telecel Cash.",
  },
  {
    q: "Why can't I see the live vote count or a leaderboard?",
    a: "Vote counts are kept completely private from voters by design — not a leaderboard, not even a single nominee's own tally. This keeps the focus on genuinely supporting a nominee rather than a numbers race — only the event organizer can see running totals on their dashboard.",
  },
  {
    q: "What happens if my payment fails?",
    a: "If a payment doesn't go through, no vote is recorded and you aren't charged. Votes are only ever counted once Paystack confirms the payment succeeded.",
  },
  {
    q: "How do I register my organization to run an event?",
    a: "Click \"Register Your Organization\" from the homepage, create an organizer account, and you can set up your first event right away — it stays in draft until you're ready to go live.",
  },
  {
    q: "Where does the money go?",
    a: "Funds collected go to the organization running the event, minus a small platform commission. Organizers can track revenue and request payouts from their dashboard.",
  },
  {
    q: "Is this a real election?",
    a: "No. uVote is built for awards nights, pageants, talent shows and similar fundraising events — for schools, churches, clubs and community groups — not political or formal elections.",
  },
];

export default function FaqPage() {
  return (
    <main className="flex-1">
      <SiteHeader />

      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-12">
        <span className="badge badge-mute mb-6">❓ FAQ</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mt-6 mb-6">
          Frequently asked <span className="text-brand">questions</span>
        </h1>
        <p className="text-lg text-ink-dim max-w-xl mx-auto">
          Still stuck? Reach out on the <a href="/contact" className="text-brand font-bold">Contact</a> page.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16 flex flex-col gap-3">
        {FAQS.map((f) => (
          <details className="faq-item card" key={f.q}>
            <summary className="faq-question">
              {f.q}
              <span className="faq-chevron">▾</span>
            </summary>
            <p className="text-sm text-ink-dim leading-relaxed px-6 pb-5 -mt-1">{f.a}</p>
          </details>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
