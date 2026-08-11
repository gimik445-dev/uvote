import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { nomineeLoginTokens } from "@/db/schema";
import {
  hashToken,
  signNomineeSession,
  NOMINEE_SESSION_COOKIE,
  NOMINEE_SESSION_MAX_AGE,
} from "@/lib/nominee-auth";

// Tapped straight from the SMS — a GET so the link "just works" with no
// extra form/click. Reusable (not single-use): a nominee should be able to
// reopen the same link throughout their event, not just once, so this only
// checks expiry, never `usedAt`. Effective expiry is the nominee's event
// end date when the event has one — the token's own fallback TTL (see
// LOGIN_TOKEN_TTL_DAYS in nominee-auth.ts) only applies to events left
// without an end date, as a backstop against links staying valid forever.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/nominee/login/[token]">
) {
  const { token } = await ctx.params;
  const baseUrl = new URL(request.url).origin;
  const tokenHash = hashToken(token);

  const row = await db.query.nomineeLoginTokens.findFirst({
    where: eq(nomineeLoginTokens.tokenHash, tokenHash),
    with: {
      nominee: {
        with: {
          category: { with: { event: true } },
        },
      },
    },
  });

  const eventEndsAt = row?.nominee?.category?.event?.endsAt ?? null;
  const effectiveExpiry = eventEndsAt ?? row?.expiresAt ?? null;

  if (!row || !effectiveExpiry || effectiveExpiry < new Date()) {
    return NextResponse.redirect(`${baseUrl}/nominee/login-expired`);
  }

  // First-use timestamp is kept for tracking only — it no longer gates
  // validity, so don't overwrite it on later opens.
  if (!row.usedAt) {
    await db
      .update(nomineeLoginTokens)
      .set({ usedAt: new Date() })
      .where(eq(nomineeLoginTokens.id, row.id));
  }

  const sessionToken = signNomineeSession({ nomineeId: row.nomineeId });
  const store = await cookies();
  store.set(NOMINEE_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: NOMINEE_SESSION_MAX_AGE,
  });

  return NextResponse.redirect(`${baseUrl}/nominee/dashboard`);
}
