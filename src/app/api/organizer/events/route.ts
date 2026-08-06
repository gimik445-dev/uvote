import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireRole } from "@/lib/session";

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  coverEmoji: z.string().max(8).optional(),
  coverImageUrl: z.string().max(2_000_000).optional(), // data: URL or hosted image URL
  ussdCode: z.string().max(32).optional(),
  pricePerVote: z.number().min(0.1).max(1000),
  currency: z.string().max(8).default("GHS"),
  endsAt: z.string().optional(),
});

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    randomUUID().slice(0, 6)
  );
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole(["organizer"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.organizationId) {
    return NextResponse.json({ error: "No organization on this account." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const [event] = await db
    .insert(events)
    .values({
      organizationId: session.organizationId,
      title: data.title,
      slug: slugify(data.title),
      description: data.description,
      coverEmoji: data.coverEmoji || "🏆",
      coverImageUrl: data.coverImageUrl,
      ussdCode: data.ussdCode,
      pricePerVote: data.pricePerVote.toFixed(2),
      currency: data.currency,
      status: "draft",
      startsAt: new Date(),
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
    })
    .returning();

  return NextResponse.json({ event });
}
