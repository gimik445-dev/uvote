import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { hashPassword, signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

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
    })
    .returning();

  const token = signSession({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId,
    email: user.email,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({
    user: { id: user.id, fullName: user.fullName, role: user.role },
    organization: org[0],
  });
}
