import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { organizations, payouts, payments, events } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { and, sql } from "drizzle-orm";

const schema = z.object({
  organizationId: z.string().uuid(),
});

// Creates a new (pending) payout covering an organization's outstanding
// balance — all-time successful revenue minus whatever's already been
// recorded in a prior payout for them.
export async function POST(request: Request) {
  try {
    await requireRole(["platform_admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { organizationId } = parsed.data;

  // Two admins (or one admin double-clicking / a retried request) hitting
  // this at the same moment could otherwise both read the same "balance
  // owed" before either insert lands, and both create a payout for it —
  // double-paying the organization. An advisory lock scoped to this
  // transaction and keyed by organizationId serializes concurrent payout
  // creation for the same org, so the second request always sees the
  // first one's newly-inserted payout before computing its own balance.
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${organizationId}))`);

    const org = await tx.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    if (!org) {
      return { error: "Organization not found.", status: 404 } as const;
    }

    const revenueRows = await tx
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(events, eq(payments.eventId, events.id))
      .where(and(eq(events.organizationId, organizationId), eq(payments.status, "success")));

    const totalRevenue = Number(revenueRows[0]?.total ?? 0);

    const existingPayouts = await tx.query.payouts.findMany({
      where: eq(payouts.organizationId, organizationId),
      orderBy: desc(payouts.createdAt),
    });

    const accountedGross = existingPayouts.reduce((s, p) => s + Number(p.grossAmount), 0);
    const balanceGross = totalRevenue - accountedGross;

    if (balanceGross <= 0) {
      return {
        error: "This organization has no outstanding balance to pay out.",
        status: 400,
      } as const;
    }

    const commissionPercent = Number(org.commissionPercent);
    const commissionAmount = balanceGross * (commissionPercent / 100);
    const netAmount = balanceGross - commissionAmount;
    const periodStart = existingPayouts[0]?.periodEnd ?? org.createdAt;
    const periodEnd = new Date();

    const [payout] = await tx
      .insert(payouts)
      .values({
        organizationId,
        grossAmount: balanceGross.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        status: "pending",
        periodStart,
        periodEnd,
      })
      .returning();

    return { payout } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ payout: result.payout });
}
