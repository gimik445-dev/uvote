import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireRole } from "@/lib/session";

// Lets an organizer remove a category they just added by mistake — mainly
// useful from the event-creation wizard's "Offer setup" step, where a
// mistyped category name is one tap away and there was previously no way
// to undo it short of contacting support. Nominees under the category are
// removed too via the DB's ON DELETE CASCADE (see nominees_category_id_fk
// in the schema) rather than anything here.
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/organizer/categories/[id]">
) {
  let session;
  try {
    session = await requireRole(["organizer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    with: { event: true },
  });
  if (!category || category.event.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(categories).where(eq(categories.id, id));

  return NextResponse.json({ ok: true });
}
