import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { voterOtps } from "@/db/schema";
import { normalizePhone } from "@/lib/sms";
import { generateOtpCode, hashOtpCode, OTP_TTL_MINUTES } from "@/lib/voter-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isVoiceOtpConfigured, requestVoiceOtp } from "@/lib/arkesel-otp";

const schema = z.object({
  phone: z.string().min(6).max(32),
});

// Same shape as the SMS route's limits (src/app/api/voter/otp/request/route.ts)
// but tracked under its own key — a burst of voice-call requests shouldn't
// also eat into the voter's SMS attempts, or vice versa.
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);

  const ip = getClientIp(request);
  const ipCheck = checkRateLimit(`voter-otp-voice:ip:${ip}`, REQUEST_LIMIT, REQUEST_WINDOW_MS);
  const phoneCheck = checkRateLimit(`voter-otp-voice:phone:${phone}`, REQUEST_LIMIT, REQUEST_WINDOW_MS);
  if (!ipCheck.allowed || !phoneCheck.allowed) {
    return NextResponse.json(
      { error: "Too many call requests — please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  if (!isVoiceOtpConfigured()) {
    // Test mode — no SMS/voice provider configured yet. Falls back to the
    // same in-house code + voterOtps row the SMS route uses in test mode,
    // so the screen stays usable end-to-end without a real Arkesel account.
    const code = generateOtpCode();
    const codeHash = hashOtpCode(code, phone);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await db.insert(voterOtps).values({ phone, codeHash, expiresAt });
    console.log(`[voice-otp test-mode] would call ${phone} and read out: ${code}`);
    return NextResponse.json({ called: true, testMode: true, devCode: code });
  }

  const result = await requestVoiceOtp(phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Couldn't place the call." }, { status: 502 });
  }
  return NextResponse.json({ called: true, testMode: false });
}
