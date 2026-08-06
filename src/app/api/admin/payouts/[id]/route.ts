import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts } from "@/db/schema";
import { requireRole } from "@/lib/session";

const schema = z.object({
  status: z.literal("paid"),
});

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/payouts/[id]">
) {
  try {
    await requireRole(["platform_admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const payout = await db.query.payouts.findFirst({ where: eq(payouts.id, id) });
  if (!payout) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payout.status === "paid") {
    return NextResponse.json({ error: "Already marked as paid." }, { status: 400 });
  }

  const [updated] = await db
    .update(payouts)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(payouts.id, id))
    .returning();

  return NextResponse.json({ payout: updated });
}
