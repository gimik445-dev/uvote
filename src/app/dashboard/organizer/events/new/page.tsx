import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { ORGANIZER_LINKS } from "@/components/organizer-nav-links";
import { EventWizard } from "./event-wizard";

export default function NewEventPage() {
  return (
    <DashboardShell
      activeLabel="Events"
      links={ORGANIZER_LINKS}
      identityLabel="Organizer"
      roleLabel="Organizer account"
    >
      <div className="mb-6">
        <Link href="/dashboard/organizer" className="text-sm text-ink-dim font-semibold">
          ← Back to overview
        </Link>
        <h1 className="text-2xl font-extrabold mt-2">Create a new event</h1>
        <p className="text-ink-dim text-sm mt-1">
          Each step saves as you go — it starts as a draft, and you can leave and come back
          before publishing.
        </p>
      </div>

      <EventWizard />
    </DashboardShell>
  );
}
