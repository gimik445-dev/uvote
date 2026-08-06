import { redirect } from "next/navigation";
import { getNomineeSession } from "@/lib/nominee-session";
import { getNomineeDashboard } from "@/lib/data";
import { NomineeVoteChart } from "./vote-chart";
import { NomineeHeader } from "./nominee-header";

export const metadata = { title: "Your results — uVote" };

export default async function NomineeDashboardPage() {
  const session = await getNomineeSession();
  if (!session) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="card p-8 max-w-sm text-center">
          <div className="text-3xl mb-4">🔒</div>
          <h1 className="text-xl font-extrabold mb-2">You&apos;re not signed in</h1>
          <p className="text-sm text-ink-dim leading-relaxed">
            Open the results link we texted you to view your dashboard. Ask your event organizer
            to resend it if you can&apos;t find it.
          </p>
        </div>
      </main>
    );
  }

  const data = await getNomineeDashboard(session.nomineeId);
  if (!data) redirect("/nominee/login-expired");

  const slices = data.all.map((n) => ({
    id: n.id,
    displayName: n.displayName,
    voteCount: n.voteCount,
    isSelf: n.id === data.id,
  }));

  return (
    <main className="flex-1">
      <NomineeHeader displayName={data.displayName} photoUrl={data.photoUrl} />

      <section
        className="relative w-full flex items-end justify-center text-center px-6 pt-16 pb-8 bg-cover bg-center"
        style={
          data.eventCoverImageUrl
            ? { backgroundImage: `url(${data.eventCoverImageUrl})` }
            : { backgroundImage: "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)" }
        }
      >
        {data.eventCoverImageUrl && (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(11,11,20,0.15) 0%, rgba(11,11,20,0.72) 100%)" }}
            aria-hidden="true"
          />
        )}
        <div className="relative max-w-xl">
          <span className="badge bg-white/15 text-white border border-white/25 mb-4">
            🏆 {data.categoryName}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1 text-white">{data.eventTitle}</h1>
          <p className="text-sm text-white/75">{data.organizationName}</p>
        </div>
      </section>

      <section className="max-w-xl mx-auto px-6 pt-8 pb-16">
        <NomineeVoteChart slices={slices} selfId={data.id} />
        <p className="text-center text-xs text-ink-mute mt-5 leading-relaxed">
          This page is private to you — voters never see vote counts, only you and your event
          organizer can.
        </p>
      </section>
    </main>
  );
}
