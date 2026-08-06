import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { organizations } from "@/db/schema";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  let organization = null;
  if (session.organizationId) {
    organization =
      (await db.query.organizations.findFirst({
        where: eq(organizations.id, session.organizationId),
      })) ?? null;
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
    },
    organization,
  });
}
