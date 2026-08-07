import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { voterOtps } from "@/db/schema";
import { normalizePhone, sendSms } from "@/lib/sms";
import { generateOtpCode, hashOtpCode, OTP_TTL_MINUTES } from "@/lib/voter-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  phone: z.string().min(6).max(32),
});

// Requesting a code is capped per-IP and per-phone — the first stops a
// script from mass-texting arbitrary numbers through us, the second stops
// someone from spamming one victim's phone with codes.
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
  const ipCheck = checkRateLimit(`voter-otp-req:ip:${ip}`, REQUEST_LIMIT, REQUEST_WINDOW_MS);
  const phoneCheck = checkRateLimit(`voter-otp-req:phone:${phone}`, REQUEST_LIMIT, REQUEST_WINDOW_MS);
  if (!ipCheck.allowed || !phoneCheck.allowed) {
    return NextResponse.json(
      { error: "Too many code requests — please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code, phone);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.insert(voterOtps).values({ phone, codeHash, expiresAt });

  const { testMode } = await sendSms({
    to: phone,
    message: `Your uVote login code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Don't share this code.`,
  });

  return NextResponse.json({ sent: true, testMode, ...(testMode ? { devCode: code } : {}) });
}
