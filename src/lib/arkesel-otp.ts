// Wraps Arkesel's dedicated OTP API (https://developers.arkesel.com), used
// only for the voice-call fallback on the voter login screen when SMS is
// running slow (see SLOW_DELIVERY_HINT_SECONDS in voter-login-client.tsx).
//
// This is a different endpoint from src/lib/sms.ts on purpose: the plain
// SMS API just sends text we compose, and we generate/store/verify the
// code ourselves (src/lib/voter-auth.ts, the voterOtps table). Arkesel's
// "voice" delivery medium only exists on this separate OTP-specific
// endpoint, and it's a hosted, all-or-nothing flow — Arkesel generates the
// code and is the one who verifies it back, there's no way to hand them a
// code we picked and have their API just read it aloud. So the voice path
// below delegates both generate and verify to Arkesel, while the SMS path
// stays exactly as it was.
//
// Same account, same api-key as src/lib/sms.ts — no new provider signup
// needed to try this.

import { normalizePhone } from "./sms";

function getApiKey(): string | null {
  const key = process.env.SMS_API_KEY;
  return key && key.length > 0 ? key : null;
}

// Mirrors isSmsConfigured() in src/lib/sms.ts — same env var, since a
// voice call goes out through the same Arkesel account as a text does.
export function isVoiceOtpConfigured(): boolean {
  return getApiKey() !== null;
}

export async function requestVoiceOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, error: "Voice calls aren't configured." };

  try {
    const res = await fetch("https://sms.arkesel.com/api/otp/generate", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        expiry: 10,
        length: 6,
        medium: "voice",
        message: "Your uVote login code is %otp_code%.",
        number: normalizePhone(phone),
        sender_id: process.env.SMS_SENDER_ID ?? "uVote",
        type: "numeric",
      }),
    });
    const json = await res.json().catch(() => null);
    // Arkesel's OTP API returns {"code":"1000", ...} on success — any
    // other code (or a non-2xx) means the call was never placed.
    if (!res.ok || json?.code !== "1000") {
      console.error("[voice-otp] generate failed:", res.status, json);
      return { ok: false, error: "Couldn't place the call. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[voice-otp] generate error:", err);
    return { ok: false, error: "Couldn't place the call. Please try again." };
  }
}

export async function verifyVoiceOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, error: "Voice calls aren't configured." };

  try {
    const res = await fetch("https://sms.arkesel.com/api/otp/verify", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: normalizePhone(phone), code }),
    });
    const json = await res.json().catch(() => null);
    // Success is {"code":"1100", ...}; anything else — wrong code, expired,
    // no OTP on file for this number — we surface as a plain wrong-code
    // error rather than echoing Arkesel's internal code back to the voter.
    if (!res.ok || json?.code !== "1100") {
      return { ok: false, error: "That code isn't right." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[voice-otp] verify error:", err);
    return { ok: false, error: "Couldn't verify the code. Please try again." };
  }
}
