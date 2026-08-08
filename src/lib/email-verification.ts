import "server-only";
import crypto from "crypto";
import { db } from "@/db";
import { emailVerificationTokens } from "@/db/schema";
import { sendEmail } from "./email";

// Shorter-lived than a nominee's results-link token (14 days) — this is a
// one-time "confirm you own this address" step right after signup, not a
// standing bookmark, so a tighter window is more appropriate.
export const VERIFICATION_TOKEN_TTL_DAYS = 3;

export function hashVerificationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateVerificationToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashVerificationToken(token) };
}

// Issues a fresh single-use token, stores only its hash, and emails the
// clickable confirmation link. Safe to call again for the same user (e.g. a
// "resend verification email" action) — each call is a new, independent token.
export async function issueAndSendVerificationEmail(params: {
  userId: string;
  email: string;
  fullName: string;
  baseUrl: string;
}): Promise<{ sent: boolean; testMode: boolean }> {
  const { token, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(emailVerificationTokens).values({
    userId: params.userId,
    tokenHash,
    expiresAt,
  });

  const link = `${params.baseUrl}/api/auth/verify-email/${token}`;
  const firstName = params.fullName.split(" ")[0];

  return sendEmail({
    to: params.email,
    subject: "Confirm your email — uVote",
    text: `Hi ${firstName}, confirm your email to finish setting up your uVote organizer account: ${link}\n\nThis link expires in ${VERIFICATION_TOKEN_TTL_DAYS} days. If you didn't create a uVote account, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #5b57e8; margin-bottom: 4px;">uVote</h2>
        <p>Hi ${firstName},</p>
        <p>Confirm your email to finish setting up your uVote organizer account.</p>
        <p style="margin: 28px 0;">
          <a href="${link}" style="background: #5b57e8; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">
            Verify my email
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">This link expires in ${VERIFICATION_TOKEN_TTL_DAYS} days. If you didn't create a uVote account, you can ignore this email.</p>
      </div>
    `,
  });
}
