import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOrganizerPayments, getOrganizerPayoutSummary } from "@/lib/data";
import { DashboardShell } from "@/components/dashboard-shell";
import { ORGANIZER_LINKS } from "@/components/organizer-nav-links";

export default async function OrganizerPaymentsPage() {
  const session = await getSession();
  if (!session || session.role !== "organizer" || !session.organizationId) {
    redirect("/login");
  }

  const [payments, summary] = await Promise.all([
    getOrganizerPayments(session.organizationId),
    getOrganizerPayoutSummary(session.organizationId),
  ]);

  return (
    <DashboardShell
      activeLabel="Payments & Payouts"
      links={ORGANIZER_LINKS}
      identityLabel={session.email}
      roleLabel="Organizer account"
    >
      <h1 className="text-2xl font-extrabold mb-1">Payments & Payouts</h1>
      <p className="text-ink-dim text-sm mb-7">
        Every vote payment across your events, and what the platform owes you.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total revenue" value={`GHS ${summary.totalRevenue.toFixed(2)}`} />
        <Stat
          label={`Platform commission (${summary.commissionPercent}%)`}
          value={`GHS ${summary.commission.toFixed(2)}`}
        />
        <Stat label="Already paid out" value={`GHS ${summary.totalPaidOut.toFixed(2)}`} />
        <Stat label="Balance due to you" value={`GHS ${summary.balanceDue.toFixed(2)}`} highlight />
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-bold mb-0.5">Payout history</h3>
        <p className="text-xs text-ink-mute mb-4">
          Payouts are issued by uVote to your registered mobile money number.
        </p>
        {summary.payouts.length === 0 ? (
          <p className="text-sm text-ink-mute py-6 text-center">
            No payouts yet — they&apos;ll appear here once uVote processes one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-mute border-b border-border">
                <th className="py-2.5 font-bold">Period</th>
                <th className="py-2.5 font-bold">Gross</th>
                <th className="py-2.5 font-bold">Commission</th>
                <th className="py-2.5 font-bold">Net</th>
                <th className="py-2.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.payouts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-3 text-xs">
                    {new Date(p.periodStart).toLocaleDateString()} –{" "}
                    {new Date(p.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="py-3">GHS {Number(p.grossAmount).toFixed(2)}</td>
                  <td className="py-3">GHS {Number(p.commissionAmount).toFixed(2)}</td>
                  <td className="py-3 font-bold">GHS {Number(p.netAmount).toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`badge ${p.status === "paid" ? "badge-good" : "badge-warning"}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-bold mb-0.5">Recent vote payments</h3>
        <p className="text-xs text-ink-mute mb-4">Last 100 verified payments across all your events</p>
        {payments.length === 0 ? (
          <p className="text-sm text-ink-mute py-6 text-center">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-mute border-b border-border">
                <th className="py-2.5 font-bold">Nominee</th>
                <th className="py-2.5 font-bold">Event</th>
                <th className="py-2.5 font-bold">Votes</th>
                <th className="py-2.5 font-bold">Amount</th>
                <th className="py-2.5 font-bold">Channel</th>
                <th className="py-2.5 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-semibold">{p.nomineeName}</td>
                  <td className="py-3 text-ink-dim">{p.eventTitle}</td>
                  <td className="py-3">{p.voteCount}</td>
                  <td className="py-3">GHS {Number(p.amount).toFixed(2)}</td>
                  <td className="py-3 text-ink-mute">{p.channel ?? "—"}</td>
                  <td className="py-3 text-xs text-ink-mute">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-5 ${highlight ? "border-brand/40 bg-brand/5" : ""}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-mute mb-2">{label}</div>
      <div className={`text-2xl font-extrabold ${highlight ? "text-brand" : ""}`}>{value}</div>
    </div>
  );
}
