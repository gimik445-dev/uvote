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

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const revenueRows = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(events, eq(payments.eventId, events.id))
    .where(and(eq(events.organizationId, organizationId), eq(payments.status, "success")));

  const totalRevenue = Number(revenueRows[0]?.total ?? 0);

  const existingPayouts = await db.query.payouts.findMany({
    where: eq(payouts.organizationId, organizationId),
    orderBy: desc(payouts.createdAt),
  });

  const accountedGross = existingPayouts.reduce((s, p) => s + Number(p.grossAmount), 0);
  const balanceGross = totalRevenue - accountedGross;

  if (balanceGross <= 0) {
    return NextResponse.json(
      { error: "This organization has no outstanding balance to pay out." },
      { status: 400 }
    );
  }

  const commissionPercent = Number(org.commissionPercent);
  const commissionAmount = balanceGross * (commissionPercent / 100);
  const netAmount = balanceGross - commissionAmount;
  const periodStart = existingPayouts[0]?.periodEnd ?? org.createdAt;
  const periodEnd = new Date();

  const [payout] = await db
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

  return NextResponse.json({ payout });
}
