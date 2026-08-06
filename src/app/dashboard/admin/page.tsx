import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPlatformOverview } from "@/lib/data";
import { DashboardShell } from "@/components/dashboard-shell";
import { ADMIN_LINKS } from "@/components/admin-nav-links";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "platform_admin") {
    redirect("/login");
  }

  const overview = await getPlatformOverview();

  return (
    <DashboardShell
      activeLabel="Overview"
      links={ADMIN_LINKS}
      identityLabel={session.email}
      roleLabel="Platform admin"
    >
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold">Platform overview 👋</h1>
        <p className="text-ink-dim text-sm mt-1">Revenue and activity across every organization on uVote.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Platform Revenue" value={`GHS ${overview.platformRevenue.toFixed(2)}`} />
        <Stat label="Commission Earned" value={`GHS ${overview.platformCommission.toFixed(2)}`} />
        <Stat label="Total Votes" value={overview.totalVotes.toLocaleString()} />
        <Stat label="Active Organizations" value={overview.activeOrgs} />
      </div>

      {overview.pendingPayouts.length > 0 && (
        <div className="card p-6 mb-6 border-l-4 border-l-accent">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold">Pending payouts</h3>
            <Link href="/dashboard/admin/payouts" className="btn btn-ghost btn-sm">
              Manage →
            </Link>
          </div>
          <p className="text-sm text-ink-dim">
            {overview.pendingPayouts.length} payout{overview.pendingPayouts.length === 1 ? "" : "s"} waiting to be paid out to organizations.
          </p>
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-bold mb-0.5">Organizations</h3>
        <p className="text-xs text-ink-mute mb-4">Every registered organization and how their events are performing</p>
        {overview.perOrgStats.length === 0 ? (
          <div className="text-center py-12 text-ink-dim">No organizations have registered yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-mute border-b border-border">
                <th className="py-2.5 font-bold">Organization</th>
                <th className="py-2.5 font-bold">Events</th>
                <th className="py-2.5 font-bold">Votes</th>
                <th className="py-2.5 font-bold">Revenue</th>
                <th className="py-2.5 font-bold">Commission</th>
                <th className="py-2.5 font-bold">Verified</th>
              </tr>
            </thead>
            <tbody>
              {overview.perOrgStats.map((o) => (
                <tr key={o.organization.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <div className="font-bold">{o.organization.name}</div>
                    <div className="text-xs text-ink-mute">/{o.organization.slug}</div>
                  </td>
                  <td className="py-3">{o.eventCount}</td>
                  <td className="py-3">{o.votes.toLocaleString()}</td>
                  <td className="py-3">GHS {o.revenue.toFixed(2)}</td>
                  <td className="py-3">GHS {o.commission.toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`badge ${o.organization.isVerified ? "badge-good" : "badge-mute"}`}>
                      {o.organization.isVerified ? "Verified" : "Unverified"}
                    </span>
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-mute mb-2">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}
