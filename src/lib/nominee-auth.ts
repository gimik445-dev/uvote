import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Separate cookie from the staff (organizer/admin) session in src/lib/auth.ts
// — a nominee isn't a `users` row and doesn't have a password, so it gets
// its own lightweight token type. Keeping the cookies distinct also means a
// nominee can be logged into their results dashboard on the same device an
// organizer is signed into the staff dashboard on, without either session
// clobbering the other.
export const NOMINEE_SESSION_COOKIE = "cv_nominee_session";
const NOMINEE_SESSION_DAYS = 30;
export const NOMINEE_SESSION_MAX_AGE = 60 * 60 * 24 * NOMINEE_SESSION_DAYS;

// How long a texted login link stays valid before it must be resent. Long
// enough that a nominee who doesn't check their phone right away can still
// use it, short enough to bound a leaked/forwarded link.
export const LOGIN_TOKEN_TTL_DAYS = 14;

export type NomineeSessionPayload = {
  nomineeId: string;
};

// The random link token is only ever stored as a hash (sha256 is fine here
// — this is a high-entropy random token, not a low-entropy password, so no
// need for bcrypt's deliberate slowness).
export function generateLoginToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signNomineeSession(payload: NomineeSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${NOMINEE_SESSION_DAYS}d` });
}

export function verifyNomineeSession(token: string): NomineeSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as NomineeSessionPayload;
  } catch {
    return null;
  }
}
