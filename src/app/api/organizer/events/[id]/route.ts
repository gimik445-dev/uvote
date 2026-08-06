import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireRole } from "@/lib/session";

const schema = z
  .object({
    status: z.enum(["draft", "active", "ended"]).optional(),
    coverImageUrl: z.string().max(2_000_000).nullable().optional(), // data: URL, hosted URL, or null to clear
  })
  .refine((v) => v.status !== undefined || v.coverImageUrl !== undefined, {
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

  const [updated] = await db
    .update(events)
    .set(updates)
    .where(and(eq(events.id, id), eq(events.organizationId, session.organizationId!)))
    .returning();

  return NextResponse.json({ event: updated });
}
