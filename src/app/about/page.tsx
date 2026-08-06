import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "About — uVote" };

export default function AboutPage() {
  return (
    <main className="flex-1">
      <SiteHeader />

      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-12">
        <span className="badge badge-mute mb-6">✨ About uVote</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mt-6 mb-6">
          Built for any organization&apos;s fundraiser, <span className="text-brand">not political elections</span>
        </h1>
        <p className="text-lg text-ink-dim max-w-xl mx-auto">
          uVote is a pay-per-vote fundraising platform — it powers awards nights,
          pageants, talent shows and fundraising events for schools, churches, clubs
          and community groups, letting anyone support their favorite nominee with a
          small mobile money or card payment.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center text-xl mb-4">💰</div>
            <h3 className="font-bold mb-1.5">Fundraising, not elections</h3>
            <p className="text-sm text-ink-dim">
              Every vote costs money and goes straight toward the organization running
              the event. There&apos;s no one-person-one-vote limit — supporters can vote for
              their nominee as many times as they like.
            </p>
          </div>
          <div className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center text-xl mb-4">🙈</div>
            <h3 className="font-bold mb-1.5">Private vote counts</h3>
            <p className="text-sm text-ink-dim">
              Voters never see a vote count — not a leaderboard, not even the nominee&apos;s
              own tally. This keeps the focus on genuine support rather than a numbers race;
              only event organizers can see running totals.
            </p>
          </div>
          <div className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center text-xl mb-4">📱</div>
            <h3 className="font-bold mb-1.5">No app, no account needed</h3>
            <p className="text-sm text-ink-dim">
              Voters never need to sign up. Open an event page, pick a nominee, pay with
              mobile money or card, and the vote is counted the moment payment is confirmed.
            </p>
          </div>
          <div className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center text-xl mb-4">🏛️</div>
            <h3 className="font-bold mb-1.5">Run by your own organization</h3>
            <p className="text-sm text-ink-dim">
              Any school department, church, club or community group can register an
              organizer account, set up an event, and start collecting votes — funds are
              tracked separately per organization.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
