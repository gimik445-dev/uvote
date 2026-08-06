import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminPayoutsOverview } from "@/lib/data";
import { DashboardShell } from "@/components/dashboard-shell";
import { ADMIN_LINKS } from "@/components/admin-nav-links";
import { PayoutsClient } from "./payouts-client";

export default async function AdminPayoutsPage() {
  const session = await getSession();
  if (!session || session.role !== "platform_admin") {
    redirect("/login");
  }

  const { orgBalances, allPayouts } = await getAdminPayoutsOverview();

  return (
    <DashboardShell
      activeLabel="Payouts"
      links={ADMIN_LINKS}
      identityLabel={session.email}
      roleLabel="Platform admin"
    >
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold">Payouts</h1>
        <p className="text-ink-dim text-sm mt-1">
          Pay organizations what they&apos;re owed, minus the platform commission.
        </p>
      </div>

      <PayoutsClient orgBalances={orgBalances} allPayouts={allPayouts} />
    </DashboardShell>
  );
}
