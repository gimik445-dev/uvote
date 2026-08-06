import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, categories } from "@/db/schema";
import { requireRole } from "@/lib/session";

const schema = z.object({ name: z.string().min(2).max(200) });

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/organizer/events/[id]/categories">
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

  const [category] = await db
    .insert(categories)
    .values({ eventId: id, name: parsed.data.name })
    .returning();

  return NextResponse.json({ category });
}
