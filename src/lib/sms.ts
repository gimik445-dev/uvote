// Thin wrapper around an SMS gateway, used only to text a nominee their
// one-tap login link.
//
// If SMS_API_KEY is not set (e.g. local development before you've created
// an account with an SMS provider), we fall back to a "test mode" that
// just logs the message to the server console instead of sending a real
// text, so the rest of the app (nominee login, the results dashboard) can
// be built and demoed end-to-end. Swap in a real key and this same code
// sends real texts — same pattern as src/lib/paystack.ts.
//
// The live implementation below targets Arkesel (https://arkesel.com), a
// commonly used SMS gateway in Ghana — a natural fit alongside the MTN
// MoMo / Telecel Cash channels already wired up for payments. If you sign
// up with a different provider (Hubtel, mNotify, Twilio, etc.) swap the
// fetch call in `sendLiveSms` for that provider's API — everything else
// in the app (token generation, the dashboard) stays the same.

function getApiKey(): string | null {
  const key = process.env.SMS_API_KEY;
  return key && key.length > 0 ? key : null;
}

export function isSmsConfigured(): boolean {
  return getApiKey() !== null;
}

// Normalizes a loosely-formatted Ghanaian number ("024 000 0000", "+233 24
// 000 0000", "0240000000") into the "233XXXXXXXXX" shape most SMS gateways
// expect. Falls back to a best-effort strip of non-digits for other formats.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  return digits;
}

export type SendSmsResult = { sent: boolean; testMode: boolean };

export async function sendSms(params: {
  to: string;
  message: string;
}): Promise<SendSmsResult> {
  const apiKey = getApiKey();
  const to = normalizePhone(params.to);

  if (!apiKey) {
    // Test mode — no SMS account configured yet. Log it so the message
    // (and the login link inside it) is still visible during development.
    // eslint-disable-next-line no-console
    console.log(
      `[sms test-mode] would text ${to}: "${params.message}" — set SMS_API_KEY to send real texts.`
    );
    return { sent: true, testMode: true };
  }

  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: process.env.SMS_SENDER_ID ?? "uVote",
        message: params.message,
        recipients: [to],
      }),
    });
    if (!res.ok) {
      console.error(`[sms] send failed: ${res.status}`);
      return { sent: false, testMode: false };
    }
    return { sent: true, testMode: false };
  } catch (err) {
    console.error("[sms] send error:", err);
    return { sent: false, testMode: false };
  }
}
