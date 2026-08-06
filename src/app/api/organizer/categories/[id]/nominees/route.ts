import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, nominees } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { issueAndSendLoginLink } from "@/lib/nominee-login";

const schema = z.object({
  displayName: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional(),
  photoUrl: z.string().max(2_000_000).optional(), // data: URL or hosted image URL
  // Required so we can automatically text the nominee their login link —
  // this is never shown to voters, only used for that one text.
  phone: z.string().min(6).max(32),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/organizer/categories/[id]/nominees">
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
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    with: { event: true },
  });
  if (!category || category.event.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [nominee] = await db
    .insert(nominees)
    .values({
      categoryId: id,
      displayName: parsed.data.displayName,
      subtitle: parsed.data.subtitle,
      photoUrl: parsed.data.photoUrl,
      phone: parsed.data.phone,
    })
    .returning();

  const baseUrl = new URL(request.url).origin;
  const smsResult = await issueAndSendLoginLink({
    nomineeId: nominee.id,
    phone: parsed.data.phone,
    displayName: parsed.data.displayName,
    baseUrl,
  });

  return NextResponse.json({ nominee, loginLinkSent: smsResult.sent, testMode: smsResult.testMode });
}
