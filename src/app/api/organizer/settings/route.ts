import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireRole } from "@/lib/session";

const schema = z.object({
  name: z.string().min(2).max(200).optional(),
  payoutMomoNumber: z.string().max(32).optional(),
});

export async function PATCH(request: Request) {
  let session;
  try {
    session = await requireRole(["organizer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.organizationId) {
    return NextResponse.json({ error: "No organization on this account." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .update(organizations)
    .set(parsed.data)
    .where(eq(organizations.id, session.organizationId))
    .returning();

  return NextResponse.json({ organization: updated });
}
