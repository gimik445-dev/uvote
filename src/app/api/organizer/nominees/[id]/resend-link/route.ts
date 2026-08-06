import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { nominees } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { issueAndSendLoginLink } from "@/lib/nominee-login";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/organizer/nominees/[id]/resend-link">
) {
  let session;
  try {
    session = await requireRole(["organizer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const nominee = await db.query.nominees.findFirst({
    where: eq(nominees.id, id),
    with: { category: { with: { event: true } } },
  });
  if (!nominee || nominee.category.event.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!nominee.phone) {
    return NextResponse.json({ error: "This nominee has no phone number on file." }, { status: 400 });
  }

  const baseUrl = new URL(request.url).origin;
  const smsResult = await issueAndSendLoginLink({
    nomineeId: nominee.id,
    phone: nominee.phone,
    displayName: nominee.displayName,
    baseUrl,
  });

  return NextResponse.json({ sent: smsResult.sent, testMode: smsResult.testMode });
}
