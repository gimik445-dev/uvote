import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

// Caps guesses against a given token per IP. The token itself is a random
// 32-byte value (astronomically unguessable), so this is mostly a backstop
// against accidental hammering, not the real defense.
const RESET_LIMIT = 10;
const RESET_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(`reset-password:${ip}`, RESET_LIMIT, RESET_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts — please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a password with at least 8 characters." },
      { status: 400 }
    );
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)),
  });

  if (!row || row.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Mark the token used and set the new password together — a token is
  // exactly one shot, whether or not anything downstream fails afterward.
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  const [user] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, row.userId))
    .returning();

  if (!user) {
    return NextResponse.json(
      { error: "This reset link has expired. Request a new one." },
      { status: 400 }
    );
  }

  // Deliberately does NOT log the user in here (unlike verify-email, which
  // does) — a password-reset link can end up somewhere less trusted than
  // the inbox it was meant for (a shared/forwarded inbox, a browser history,
  // a screenshot), so treat it as strictly "prove you can set a password",
  // not "prove who you are". They sign in normally afterward, with the
  // password they just chose.
  return NextResponse.json({ ok: true });
}
