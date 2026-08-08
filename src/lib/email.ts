// Sends transactional email via Resend (https://resend.com — has a free
// tier, simple REST API, no domain purchase required to get started).
// Mirrors src/lib/sms.ts: no RESEND_API_KEY configured → log to console and
// report success ("test mode") instead of failing, so registration/login
// keep working end-to-end in local/preview environments with nothing set up.
function getApiKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  return key && key.length > 0 ? key : null;
}

export function isEmailConfigured(): boolean {
  return getApiKey() !== null;
}

export type SendEmailResult = { sent: boolean; testMode: boolean };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log(
      `[email test-mode] would send to ${params.to}: "${params.subject}"\n${params.text}\n— set RESEND_API_KEY to send real emails.`
    );
    return { sent: true, testMode: true };
  }

  // RESEND_FROM lets a verified custom domain (e.g. "uVote <hello@uvote.app>")
  // be used once one exists; until then Resend's shared onboarding address
  // works for any recipient without domain verification.
  const from = process.env.RESEND_FROM ?? "uVote <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!res.ok) {
      console.error(`[email] send failed: ${res.status} ${await res.text()}`);
      return { sent: false, testMode: false };
    }
    return { sent: true, testMode: false };
  } catch (err) {
    console.error("[email] send error:", err);
    return { sent: false, testMode: false };
  }
}
