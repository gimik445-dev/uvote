import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { issueAndSendVerificationEmail } from "@/lib/email-verification";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  // Always respond success either way — confirming whether an email exists
  // in the system to an unauthenticated caller is an account-enumeration
  // leak, and there's nothing actionable a real owner loses by this.
  if (!user || user.emailVerifiedAt) {
    return NextResponse.json({ status: "ok" });
  }

  const baseUrl = new URL(request.url).origin;
  await issueAndSendVerificationEmail({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    baseUrl,
  });

  return NextResponse.json({ status: "ok" });
}
