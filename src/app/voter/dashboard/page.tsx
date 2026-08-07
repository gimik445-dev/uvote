import Link from "next/link";
import { Logo } from "@/components/logo";
import { getVoterSession } from "@/lib/voter-session";
import { getVoterVoteHistory } from "@/lib/data";
import { VoterHeader } from "./voter-header";

export const metadata = { title: "My votes — uVote" };

export default async function VoterDashboardPage() {
  const session = await getVoterSession();
  if (!session) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-sm w-full flex flex-col items-center">
          <div className="mb-6">
            <Logo size="sm" />
          </div>
          <div className="card p-8 text-center w-full">
            <div className="text-3xl mb-4">🔒</div>
            <h1 className="text-xl font-extrabold mb-2">You&apos;re not signed in</h1>
            <p className="text-sm text-ink-dim leading-relaxed mb-5">
              Log in with the phone number you voted with to see your vote history.
            </p>
            <Link href="/voter/login" className="btn btn-primary btn-sm">
              Log in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { totalVotes, totalSpent, votes } = await getVoterVoteHistory(session.phone);
  const currency = votes[0]?.nominee.category.event.currency ?? "GHS";

  return (
    <main className="flex-1">
      <VoterHeader phone={session.phone} />

      <section className="max-w-xl mx-auto px-6 pt-8 pb-16">
        <h1 className="text-xl font-extrabold mb-1">Your votes</h1>
        <p className="text-sm text-ink-dim mb-6">
          Every successful vote placed with this phone number, across every event.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-extrabold">{totalVotes.toLocaleString()}</div>
            <div className="text-xs text-ink-mute mt-1">Total votes</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-extrabold">
              {currency} {totalSpent.toFixed(2)}
            </div>
            <div className="text-xs text-ink-mute mt-1">Total spent</div>
          </div>
        </div>

        {votes.length === 0 ? (
          <p className="text-sm text-ink-mute text-center py-10">
            No votes found for this number yet. Votes only appear here if you entered this phone
            number when you paid.
          </p>
        ) : (
          <div className="space-y-3">
            {votes.map((v) => (
              <div key={v.id} className="card p-4 flex items-center gap-3">
                {v.nominee.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.nominee.photoUrl}
                    alt={v.nominee.displayName}
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center font-bold shrink-0">
                    {v.nominee.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{v.nominee.displayName}</div>
                  <div className="text-xs text-ink-mute truncate">
                    {v.nominee.category.event.title} · {v.nominee.category.name}
                  </div>
                  <div className="text-xs text-ink-mute">
                    {v.verifiedAt ? new Date(v.verifiedAt).toLocaleDateString() : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-sm">{v.voteCount.toLocaleString()} votes</div>
                  <div className="text-xs text-ink-mute">
                    {v.currency} {Number(v.amount).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
