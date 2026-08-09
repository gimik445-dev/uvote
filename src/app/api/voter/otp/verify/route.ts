import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { voterOtps } from "@/db/schema";
import { normalizePhone } from "@/lib/sms";
import {
    hashOtpCode,
    signVoterSession,
    VOTER_SESSION_COOKIE,
    VOTER_SESSION_MAX_AGE,
    OTP_MAX_ATTEMPTS,
} from "@/lib/voter-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
    phone: z.string().min(6).max(32),
    code: z.string().min(4).max(8),
});

const VERIFY_LIMIT = 10;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
          return NextResponse.json({ error: "Enter the code we texted you." }, { status: 400 });
    }
    const phone = normalizePhone(parsed.data.phone);
    const code = parsed.data.code.trim();

  const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`voter-otp-verify:${ip}`, VERIFY_LIMIT, VERIFY_WINDOW_MS);
    if (!allowed) {
          return NextResponse.json(
            { error: "Too many attempts — please wait a few minutes and try again." },
            { status: 429 }
                );
    }

  // All unused, unexpired codes for this phone — not just the newest one.
  // SMS delivery here can lag several minutes, so a voter who taps "Resend"
  // out of impatience ends up with two codes in flight; whichever text
  // actually arrives first should still work, not just the latest.
  const otps = await db.query.voterOtps.findMany({
        where: and(eq(voterOtps.phone, phone), isNull(voterOtps.usedAt), gt(voterOtps.expiresAt, new Date())),
        orderBy: desc(voterOtps.createdAt),
  });

  if (otps.length === 0) {
        return NextResponse.json(
          { error: "That code has expired. Request a new one." },
          { status: 400 }
              );
  }

  const mostRecent = otps[0];
    if (otps.every((otp) => otp.attempts >= OTP_MAX_ATTEMPTS)) {
          return NextResponse.json(
            { error: "Too many wrong attempts. Request a new code." },
            { status: 400 }
                );
    }

  const codeHash = hashOtpCode(code, phone);
    const match = otps.find((otp) => otp.codeHash === codeHash);
    if (!match) {
          // Track the wrong attempt against the newest code — repeated misses
      // still lock the voter out via OTP_MAX_ATTEMPTS.
      await db
            .update(voterOtps)
            .set({ attempts: mostRecent.attempts + 1 })
            .where(eq(voterOtps.id, mostRecent.id));
          return NextResponse.json({ error: "That code isn't right." }, { status: 400 });
    }

  await db.update(voterOtps).set({ usedAt: new Date() }).where(eq(voterOtps.id, match.id));

  const token = signVoterSession({ phone });
    const store = await cookies();
    store.set(VOTER_SESSION_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: VOTER_SESSION_MAX_AGE,
    });

  return NextResponse.json({ ok: true });
}
