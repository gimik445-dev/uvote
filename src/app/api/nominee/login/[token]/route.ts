import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { nomineeLoginTokens } from "@/db/schema";
import {
  hashToken,
  signNomineeSession,
  NOMINEE_SESSION_COOKIE,
  NOMINEE_SESSION_MAX_AGE,
} from "@/lib/nominee-auth";

// Tapped straight from the SMS — a GET so the link "just works" with no
// extra form/click. Single-use and expiring, verified server-side before
// any session cookie is set.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/nominee/login/[token]">
) {
  const { token } = await ctx.params;
  const baseUrl = new URL(request.url).origin;
  const tokenHash = hashToken(token);

  const row = await db.query.nomineeLoginTokens.findFirst({
    where: and(eq(nomineeLoginTokens.tokenHash, tokenHash), isNull(nomineeLoginTokens.usedAt)),
  });

  if (!row || row.expiresAt < new Date()) {
    return NextResponse.redirect(`${baseUrl}/nominee/login-expired`);
  }

  await db
    .update(nomineeLoginTokens)
    .set({ usedAt: new Date() })
    .where(eq(nomineeLoginTokens.id, row.id));

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
