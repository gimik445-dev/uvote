import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, payments } from "@/db/schema";
import { requireRole } from "@/lib/session";

const schema = z
  .object({
    status: z.enum(["draft", "active", "ended"]).optional(),
    coverImageUrl: z.string().max(2_000_000).nullable().optional(), // data: URL, hosted URL, or null to clear
    // Everything below was previously only settable at creation time — the
    // event-creation wizard (src/app/dashboard/organizer/events/new) saves
    // each step against the draft event as the organizer moves through it,
    // rather than collecting the whole form before the event exists.
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    coverEmoji: z.string().max(8).optional(),
    ussdCode: z.string().max(32).nullable().optional(),
    pricePerVote: z.number().min(0.1).max(1000).optional(),
    currency: z.string().max(8).optional(),
    endsAt: z.string().nullable().optional(),
  })
  .refine((v) => Object.values(v).some((val) => val !== undefined), {
    message: "Nothing to update",
  });

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/organizer/events/[id]">
) {
  let session;
  try {
    session = await requireRole(["organizer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event || event.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Partial<typeof events.$inferInsert> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.coverImageUrl !== undefined) updates.coverImageUrl = parsed.data.coverImageUrl;
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description ?? undefined;
  if (parsed.data.coverEmoji !== undefined) updates.coverEmoji = parsed.data.coverEmoji;
  if (parsed.data.ussdCode !== undefined) updates.ussdCode = parsed.data.ussdCode ?? undefined;
  if (parsed.data.pricePerVote !== undefined) updates.pricePerVote = parsed.data.pricePerVote.toFixed(2);
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.endsAt !== undefined) {
    updates.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined;
  }

  const [updated] = await db
    .update(events)
    .set(updates)
    .where(and(eq(events.id, id), eq(events.organizationId, session.organizationId!)))
    .returning();

  return NextResponse.json({ event: updated });
}

// Permanently deletes an event (and, via schema cascade, its categories,
// nominees, and payment rows). Refused for any event that has a real
// (successful) payment on it — deleting that would silently erase revenue
// history the admin payouts page and the organization's own records depend
// on. Use "End Event" to retire a live event instead; this endpoint is for
// clearing out drafts/test events that never took real money.
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/organizer/events/[id]">
) {
  let session;
  try {
    session = await requireRole(["organizer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event || event.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const successfulPayment = await db.query.payments.findFirst({
    where: and(eq(payments.eventId, id), eq(payments.status, "success")),
  });
  if (successfulPayment) {
    return NextResponse.json(
      {
        error:
          "This event has recorded payments and can't be deleted, to protect the revenue history. End the event instead to close it to voting.",
      },
      { status: 409 }
    );
  }

  await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.organizationId, session.organizationId!)));

  return NextResponse.json({ ok: true });
}
