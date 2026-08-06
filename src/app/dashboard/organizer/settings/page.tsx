import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { ORGANIZER_LINKS } from "@/components/organizer-nav-links";
import { SettingsForm } from "./settings-form";

export default async function OrganizerSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "organizer" || !session.organizationId) {
    redirect("/login");
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
  });
  if (!org) redirect("/login");

  return (
    <DashboardShell
      activeLabel="Settings"
      links={ORGANIZER_LINKS}
      identityLabel={session.email}
      roleLabel="Organizer account"
    >
      <h1 className="text-2xl font-extrabold mb-1">Settings</h1>
      <p className="text-ink-dim text-sm mb-7">
        Manage your organization&apos;s name and where uVote sends your payouts.
      </p>
      <SettingsForm organization={org} email={session.email} />
    </DashboardShell>
  );
}
