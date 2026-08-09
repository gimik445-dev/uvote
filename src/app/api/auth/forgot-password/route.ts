import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { issueAndSendPasswordResetEmail } from "@/lib/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

// Mirrors src/app/api/auth/resend-verification/route.ts — same shape, same
// per-IP cap, same "send a real email per hit" cost concern.
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = checkRateLimit(`forgot-password:${ip}`, REQUEST_LIMIT, REQUEST_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": Math.ceil(retryAfterMs / 1000).toString() } }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  // Always respond exactly the same way either way — confirming whether an
  // email exists in the system to an unauthenticated caller is an
  // account-enumeration leak (same reasoning as resend-verification). That
  // means we deliberately do NOT surface `testMode` here the way register
  // does: whether the no-provider-configured fallback fired would itself
  // differ only for real accounts, leaking existence through the response
  // shape. Check the server console in local/preview environments instead.
  if (user) {
    await issueAndSendPasswordResetEmail({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      baseUrl: new URL(request.url).origin,
    });
  }

  return NextResponse.json({ status: "ok" });
}
