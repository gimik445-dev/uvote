"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OrgBalance = {
  organization: {
    id: string;
    name: string;
    slug: string;
    commissionPercent: string;
    payoutMomoNumber: string | null;
    payoutBankDetails: string | null;
  };
  totalRevenue: number;
  balanceGross: number;
  balanceCommission: number;
  balanceNet: number;
  lastPayoutEnd: Date | null;
};

type Payout = {
  id: string;
  organizationId: string;
  grossAmount: string;
  commissionAmount: string;
  netAmount: string;
  status: "pending" | "paid";
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  createdAt: Date;
  organization: { name: string } | null;
};

// Surfaces where the admin should actually send the money — organizers set
// this in their own settings, but until now it wasn't visible on the admin
// payouts page, so an admin had to go digging in the database or ask the
// organizer directly before every transfer.
function PayoutDestination({
  organization,
}: {
  organization: { payoutMomoNumber: string | null; payoutBankDetails: string | null };
}) {
  if (!organization.payoutMomoNumber && !organization.payoutBankDetails) {
    return <div className="text-xs text-critical mt-0.5">No payout details on file</div>;
  }
  return (
    <div className="text-xs text-ink-mute mt-0.5 leading-relaxed">
      {organization.payoutMomoNumber && <div>Momo: {organization.payoutMomoNumber}</div>}
      {organization.payoutBankDetails && <div>Bank: {organization.payoutBankDetails}</div>}
    </div>
  );
}

export function PayoutsClient({
  orgBalances,
  allPayouts,
}: {
  orgBalances: OrgBalance[];
  allPayouts: Payout[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const owedOrgs = orgBalances.filter((o) => o.balanceNet > 0.009);

  async function createPayout(organizationId: string) {
    setError(null);
    setBusyId(organizationId);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(payoutId: string) {
    setError(null);
    setBusyId(payoutId);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="card p-4 border-l-4 border-l-critical text-sm text-critical">{error}</div>
      )}

      <div className="card p-6">
        <h3 className="font-bold mb-0.5">Outstanding balances</h3>
        <p className="text-xs text-ink-mute mb-4">
          Revenue collected since each organization&apos;s last payout, not yet paid out
        </p>
        {owedOrgs.length === 0 ? (
          <div className="text-center py-10 text-ink-dim text-sm">
            Every organization is paid up — nothing owed right now.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-mute border-b border-border">
                <th className="py-2.5 font-bold">Organization</th>
                <th className="py-2.5 font-bold">Gross</th>
                <th className="py-2.5 font-bold">Commission</th>
                <th className="py-2.5 font-bold">Net owed</th>
                <th className="py-2.5 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {owedOrgs.map((o) => (
                <tr key={o.organization.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <div className="font-bold">{o.organization.name}</div>
                    <PayoutDestination organization={o.organization} />
                  </td>
                  <td className="py-3">GHS {o.balanceGross.toFixed(2)}</td>
                  <td className="py-3 text-ink-mute">GHS {o.balanceCommission.toFixed(2)}</td>
                  <td className="py-3 font-bold text-brand">GHS {o.balanceNet.toFixed(2)}</td>
                  <td className="py-3 text-right">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={busyId === o.organization.id}
                      onClick={() => createPayout(o.organization.id)}
                    >
                      {busyId === o.organization.id ? "Creating…" : "Create payout"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-bold mb-0.5">Payout history</h3>
        <p className="text-xs text-ink-mute mb-4">Every payout ever recorded, across all organizations</p>
        {allPayouts.length === 0 ? (
          <div className="text-center py-10 text-ink-dim text-sm">No payouts recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-mute border-b border-border">
                <th className="py-2.5 font-bold">Organization</th>
                <th className="py-2.5 font-bold">Period</th>
                <th className="py-2.5 font-bold">Net amount</th>
                <th className="py-2.5 font-bold">Status</th>
                <th className="py-2.5 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {allPayouts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-bold">{p.organization?.name ?? "—"}</td>
                  <td className="py-3 text-xs text-ink-mute">
                    {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="py-3">GHS {Number(p.netAmount).toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`badge ${p.status === "paid" ? "badge-good" : "badge-warning"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {p.status === "pending" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busyId === p.id}
                        onClick={() => markPaid(p.id)}
                      >
                        {busyId === p.id ? "Saving…" : "Mark paid"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
