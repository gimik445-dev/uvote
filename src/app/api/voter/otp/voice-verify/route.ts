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
import { isVoiceOtpConfigured, verifyVoiceOtp } from "@/lib/arkesel-otp";

const schema = z.object({
  phone: z.string().min(6).max(32),
  code: z.string().min(4).max(8),
});

const VERIFY_LIMIT = 10;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;

async function grantVoterSession(phone: string) {
  const token = signVoterSession({ phone });
  const store = await cookies();
  store.set(VOTER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VOTER_SESSION_MAX_AGE,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the code we called you with." }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);
  const code = parsed.data.code.trim();

  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(`voter-otp-voice-verify:${ip}`, VERIFY_LIMIT, VERIFY_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts — please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  if (!isVoiceOtpConfigured()) {
    // Test mode — voice-request stored its code in the same voterOtps
    // table the SMS flow uses, so verification is the same lookup.
    const otps = await db.query.voterOtps.findMany({
      where: and(eq(voterOtps.phone, phone), isNull(voterOtps.usedAt), gt(voterOtps.expiresAt, new Date())),
      orderBy: desc(voterOtps.createdAt),
    });
    if (otps.length === 0) {
      return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
    }
    const mostRecent = otps[0];
    if (otps.every((otp) => otp.attempts >= OTP_MAX_ATTEMPTS)) {
      return NextResponse.json({ error: "Too many wrong attempts. Request a new code." }, { status: 400 });
    }
    const codeHash = hashOtpCode(code, phone);
    const match = otps.find((otp) => otp.codeHash === codeHash);
    if (!match) {
      await db
        .update(voterOtps)
        .set({ attempts: mostRecent.attempts + 1 })
        .where(eq(voterOtps.id, mostRecent.id));
      return NextResponse.json({ error: "That code isn't right." }, { status: 400 });
    }
    await db.update(voterOtps).set({ usedAt: new Date() }).where(eq(voterOtps.id, match.id));
    await grantVoterSession(phone);
    return NextResponse.json({ ok: true });
  }

  // Live mode — the code was generated and is held by Arkesel, not us, so
  // verification is a call to their API rather than a local DB lookup.
  const result = await verifyVoiceOtp(phone, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "That code isn't right." }, { status: 400 });
  }
  await grantVoterSession(phone);
  return NextResponse.json({ ok: true });
}
