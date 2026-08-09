import "server-only";
import crypto from "crypto";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import { sendEmail } from "./email";

// Deliberately much shorter than VERIFICATION_TOKEN_TTL_DAYS (3 days, see
// src/lib/email-verification.ts) — a live password-reset link is a bigger
// standing risk than an unclicked "confirm your email" link, so it should
// go stale fast rather than sit in an inbox for days.
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generatePasswordResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

// Issues a fresh single-use token, stores only its hash, and emails the
// clickable reset link. Safe to call again for the same user (e.g. a
// "resend" click) — each call is a new, independent token; older
// still-unused tokens for the user are left alone (harmless — they'll just
// expire on their own, and the reset route only ever consumes one).
export async function issueAndSendPasswordResetEmail(params: {
  userId: string;
  email: string;
  fullName: string;
  baseUrl: string;
}): Promise<{ sent: boolean; testMode: boolean }> {
  const { token, tokenHash } = generatePasswordResetToken();
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  await db.insert(passwordResetTokens).values({
    userId: params.userId,
    tokenHash,
    expiresAt,
  });

  const link = `${params.baseUrl}/reset-password/${token}`;
  const firstName = params.fullName.split(" ")[0];

  return sendEmail({
    to: params.email,
    subject: "Reset your password — uVote",
    text: `Hi ${firstName}, someone (hopefully you) asked to reset the password on your uVote account. Choose a new one here: ${link}\n\nThis link expires in ${PASSWORD_RESET_TOKEN_TTL_HOURS} hour${PASSWORD_RESET_TOKEN_TTL_HOURS === 1 ? "" : "s"}. If you didn't request this, you can ignore this email — your password won't change.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #5b57e8; margin-bottom: 4px;">uVote</h2>
        <p>Hi ${firstName},</p>
        <p>Someone (hopefully you) asked to reset the password on your uVote account.</p>
        <p style="margin: 28px 0;">
          <a href="${link}" style="background: #5b57e8; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">
            Choose a new password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">This link expires in ${PASSWORD_RESET_TOKEN_TTL_HOURS} hour${PASSWORD_RESET_TOKEN_TTL_HOURS === 1 ? "" : "s"}. If you didn't request this, you can ignore this email — your password won't change.</p>
      </div>
    `,
  });
}
