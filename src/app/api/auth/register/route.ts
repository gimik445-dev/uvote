import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { issueAndSendVerificationEmail } from "@/lib/email-verification";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

// Caps signups per IP — stops a script from mass-creating accounts /
// burning verification emails.
const REGISTER_LIMIT = 8;
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const schema = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8),
  accountType: z.enum(["organizer", "voter"]),
  organizationName: z.string().min(2).max(200).optional(),
});

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = checkRateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts — please wait a while and try again." },
      { status: 429, headers: { "Retry-After": Math.ceil(retryAfterMs / 1000).toString() } }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { fullName, email, password, accountType, organizationName } =
    parsed.data;

  // "voter" registration doesn't actually apply here: voting never requires
  // an account. We only create real user rows for organizers (staff of the
  // organization running events — a school department, a church, a club,
  // any group) and, separately, nominees get invited by an organizer. If
  // someone submits accountType "voter" we simply decline — there's nothing
  // to register for.
  if (accountType === "voter") {
    return NextResponse.json(
      {
        error:
          "Voters don't need an account — head to an event page and vote directly.",
      },
      { status: 400 }
    );
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const org = await db
    .insert(organizations)
    .values({
      name: organizationName || `${fullName}'s Organization`,
      slug: slugify(organizationName || fullName),
    })
    .returning();

  const [user] = await db
    .insert(users)
    .values({
      fullName,
      email,
      passwordHash,
      role: "organizer",
      organizationId: org[0].id,
      // emailVerifiedAt stays null until they click the link we're about to
      // send — no session is issued yet, so the account can't be used until then.
    })
    .returning();

  const baseUrl = new URL(request.url).origin;
  const { testMode } = await issueAndSendVerificationEmail({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    baseUrl,
  });

  return NextResponse.json({
    status: "check_email",
    email: user.email,
    // Surfaced so the frontend can show the actual link when no email
    // provider is configured yet (local/preview), instead of a dead end.
    testMode,
  });
}
