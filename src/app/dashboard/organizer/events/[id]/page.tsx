import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getOrganizerEventDetail } from "@/lib/data";
import { DashboardShell } from "@/components/dashboard-shell";
import { ManageEventClient } from "./manage-event-client";
import { ORGANIZER_LINKS } from "@/components/organizer-nav-links";

export default async function ManageEventPage({
  params,
}: PageProps<"/dashboard/organizer/events/[id]">) {
  const session = await getSession();
  if (!session || session.role !== "organizer" || !session.organizationId) {
    redirect("/login");
  }

  const { id } = await params;
  const event = await getOrganizerEventDetail(session.organizationId, id);
  if (!event) notFound();

  return (
    <DashboardShell
      activeLabel="Events"
      links={ORGANIZER_LINKS}
      identityLabel={session.email}
      roleLabel="Organizer account"
    >
      <div className="mb-6">
        <Link href="/dashboard/organizer" className="text-sm text-ink-dim font-semibold">
          ← Back to overview
        </Link>
      </div>
      <ManageEventClient event={event} />
    </DashboardShell>
  );
}
