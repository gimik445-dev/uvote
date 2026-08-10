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
      {/* Dark "glass" hero — a deliberate one-off accent for the start of the
          event-creation flow (echoes the frosted, near-black card look the
          client pointed to), not a site-wide theme change. The rest of the
          dashboard stays on the light indigo/gold theme. */}
      <div className="relative overflow-hidden rounded-[28px] mb-6 px-7 py-9 sm:px-10 sm:py-11 bg-gradient-to-br from-[#181a2c] to-[#06070d] shadow-[0_25px_60px_-20px_rgba(5,6,20,0.55)]">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="relative">
          <Link
            href="/dashboard/organizer"
            className="text-sm text-white/50 font-semibold hover:text-white/80 transition-colors"
          >
            ← Back to overview
          </Link>
          <span className="block text-[11px] font-extrabold tracking-[0.15em] uppercase text-brand-light mt-5">
            Event setup
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
            Create a new event
          </h1>
          <p className="text-white/55 text-sm mt-3 max-w-md">
            Each step saves as you go — it starts as a draft, and you can leave and come back
            before publishing.
          </p>
        </div>
      </div>

      <EventWizard />
    </DashboardShell>
  );
}
