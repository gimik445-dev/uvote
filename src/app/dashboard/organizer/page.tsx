import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOrganizerOverview } from "@/lib/data";
import { DashboardShell } from "@/components/dashboard-shell";
import { ORGANIZER_LINKS } from "@/components/organizer-nav-links";

export default async function OrganizerDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "organizer" || !session.organizationId) {
    redirect("/login");
  }

  const overview = await getOrganizerOverview(session.organizationId);
  const maxDaily = Math.max(1, ...overview.dailyRevenue.map((d) => Number(d.total)));

  return (
    <DashboardShell
      activeLabel="Overview"
      links={ORGANIZER_LINKS}
      identityLabel={session.email}
      roleLabel="Organizer account"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-extrabold">Welcome back 👋</h1>
          <p className="text-ink-dim text-sm mt-1">Here&apos;s how your events are performing.</p>
        </div>
        <Link href="/dashboard/organizer/events/new" className="btn btn-primary btn-sm">
          + New Event
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Votes" value={overview.totalVotes.toLocaleString()} />
        <Stat label="Revenue" value={`GHS ${overview.revenue.toFixed(2)}`} />
        <Stat label="Active Events" value={overview.events.filter((e) => e.status === "active").length} />
        <Stat label="Total Events" value={overview.events.length} />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 mb-6">
        <div className="card p-6">
          <h3 className="font-bold mb-0.5">Revenue — last 7 days</h3>
          <p className="text-xs text-ink-mute mb-5">GHS collected per day across all events</p>
          {overview.dailyRevenue.length === 0 ? (
            <p className="text-sm text-ink-mute py-10 text-center">No revenue yet — once votes come in, you&apos;ll see it here.</p>
          ) : (
            <div className="flex items-end gap-2.5 h-40">
              {overview.dailyRevenue.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t bg-brand"
                    style={{ height: `${Math.max(4, (Number(d.total) / maxDaily) * 100)}%` }}
                  />
                  <div className="mt-2 text-[10.5px] font-bold text-ink-mute">{d.day}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-bold mb-0.5">Recent activity</h3>
          <p className="text-xs text-ink-mute mb-4">Live feed</p>
          {overview.recentActivity.length === 0 ? (
            <p className="text-sm text-ink-mute py-6 text-center">No votes yet.</p>
          ) : (
            overview.recentActivity.map((a, i) => (
              <div key={i} className="flex gap-2.5 py-2.5 border-b border-border last:border-0 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                <div>
                  {a.voteCount} votes for <b>{a.nomineeName}</b>
                  <div className="text-[11px] text-ink-mute">
                    {new Date(a.createdAt).toLocaleString()} · {a.channel ?? "—"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold mb-0.5">Your events</h3>
        <p className="text-xs text-ink-mute mb-4">Manage categories, nominees and status</p>
        {overview.events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-dim mb-4">You haven&apos;t created any events yet.</p>
            <Link href="/dashboard/organizer/events/new" className="btn btn-primary btn-sm">
              Create your first event
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-mute border-b border-border">
                <th className="py-2.5 font-bold">Event</th>
                <th className="py-2.5 font-bold">Categories</th>
                <th className="py-2.5 font-bold">Status</th>
                <th className="py-2.5 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {overview.events.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <div className="font-bold">{e.title}</div>
                    <div className="text-xs text-ink-mute">/events/{e.slug}</div>
                  </td>
                  <td className="py-3">{e.categories.length}</td>
                  <td className="py-3">
                    <span className={`badge ${e.status === "active" ? "badge-good" : e.status === "draft" ? "badge-warning" : "badge-mute"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/dashboard/organizer/events/${e.id}`} className="btn btn-ghost btn-sm">
                      Manage
                    </Link>
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
