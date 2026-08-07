import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Separate cookie from both the staff session (src/lib/auth.ts) and the
// nominee session (src/lib/nominee-auth.ts) — a voter isn't a `users` row
// and proves their identity with a phone + one-time code, not a password
// or a texted link. Keeping it distinct means all three can be logged in
// on the same device at once without clobbering each other.
export const VOTER_SESSION_COOKIE = "cv_voter_session";
const VOTER_SESSION_DAYS = 30;
export const VOTER_SESSION_MAX_AGE = 60 * 60 * 24 * VOTER_SESSION_DAYS;

// Short-lived — this is a login code sent over SMS, not a magic link, so it
// only needs to survive the minute or two it takes to read the text and
// type it back in.
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export type VoterSessionPayload = {
  phone: string; // normalized "233XXXXXXXXX" form
};

export function generateOtpCode(): string {
  // 6-digit numeric code, zero-padded. crypto.randomInt is uniform (unlike
  // Math.random) and appropriate for a value that gates account access.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(code: string, phone: string): string {
  // Salt with the phone number so the same code for two different numbers
  // doesn't hash identically.
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function signVoterSession(payload: VoterSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${VOTER_SESSION_DAYS}d` });
}

export function verifyVoterSession(token: string): VoterSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as VoterSessionPayload;
  } catch {
    return null;
  }
}
