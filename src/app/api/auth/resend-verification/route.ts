import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { issueAndSendVerificationEmail } from "@/lib/email-verification";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

// Caps resend requests per IP — this endpoint sends a real email per hit,
// so it's an easy way to spam an inbox (or run up email provider costs)
// without a limit.
const RESEND_LIMIT = 5;
const RESEND_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = checkRateLimit(`resend-verify:${ip}`, RESEND_LIMIT, RESEND_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": Math.ceil(retryAfterMs / 1000).toString() } }
    );
  }

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
