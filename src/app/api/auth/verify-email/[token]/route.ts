import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { hashVerificationToken } from "@/lib/email-verification";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

// Mirrors src/app/api/nominee/login/[token]/route.ts: look up the token by
// its hash and require it be unexpired, then treat a successful click as
// both "email confirmed" and "log me in" — one link, one step, no separate
// password re-entry right after they just set one.
//
// Deliberately NOT gated on `usedAt` (i.e. not single-use): many mail
// clients (Gmail/Outlook link-scanning, corporate proxies) fire a GET
// against links in an email before the person ever clicks it, to prescan
// for safety. A single-use token gets silently burned by that scan, so the
// person's real click lands on the "expired" page even though the link is
// only seconds old. Re-verifying an already-verified email is harmless
// (both branches below are idempotent), so it's safe to just gate on
// expiry instead.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/auth/verify-email/[token]">
) {
  const { token } = await ctx.params;
  const baseUrl = new URL(request.url).origin;
  const tokenHash = hashVerificationToken(token);

  const row = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.tokenHash, tokenHash),
  });

  if (!row || row.expiresAt < new Date()) {
    return NextResponse.redirect(`${baseUrl}/verify-email-expired`);
  }

  // First-use timestamp is kept for tracking only — it no longer gates
  // validity, so don't overwrite it on later opens/prescans.
  if (!row.usedAt) {
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, row.id));
  }

  const [user] = await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, row.userId))
    .returning();

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/verify-email-expired`);
  }

  const sessionToken = signSession({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId,
    email: user.email,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.redirect(`${baseUrl}/dashboard/organizer?verified=1`);
}

