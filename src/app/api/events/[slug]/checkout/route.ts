import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, nominees, categories, payments } from "@/db/schema";
import { initializeTransaction } from "@/lib/paystack";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/sms";

const schema = z.object({
  nomineeId: z.string().uuid(),
  voteCount: z.number().int().min(1).max(2000),
  // Accept "" the same as "not provided" — the client always sends this key,
  // but only some payment channels actually require a phone number.
  phone: z
    .string()
    .max(32)
    .optional()
    .refine((v) => !v || v.length >= 6, "Phone number looks too short.")
    .transform((v) => (v ? v : undefined)),
  email: z.string().email().optional(),
});

// Checkout attempts (not votes) are capped per IP — this stops a script
// from flooding the endpoint with pending-payment rows or hammering
// Paystack, without getting in the way of a real person buying votes a
// few times in a row.
const CHECKOUT_LIMIT = 20;
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/events/[slug]/checkout">
) {
  const { slug } = await ctx.params;

  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = checkRateLimit(
    `checkout:${ip}:${slug}`,
    CHECKOUT_LIMIT,
    CHECKOUT_WINDOW_MS
  );
  if (!allowed) {
    return NextResponse.json(
      {
        error: "Too many checkout attempts — please wait a few minutes and try again.",
      },
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
  const { nomineeId, voteCount, phone, email } = parsed.data;

  const event = await db.query.events.findFirst({
    where: and(eq(events.slug, slug), eq(events.status, "active")),
  });
  if (!event) {
    return NextResponse.json(
      { error: "This event isn't open for voting." },
      { status: 404 }
    );
  }

  // An organizer can leave status "active" past the event's own end date —
  // treat that as closed for new votes rather than trusting status alone.
  if (event.endsAt && new Date(event.endsAt) < new Date()) {
    return NextResponse.json(
      { error: "Voting has closed for this event." },
      { status: 400 }
    );
  }

  // Confirm the nominee genuinely belongs to a category under THIS event —
  // otherwise a crafted request could route money/votes to the wrong event.
  const nominee = await db.query.nominees.findFirst({
    where: eq(nominees.id, nomineeId),
    with: { category: true },
  });
  if (!nominee || nominee.category.eventId !== event.id) {
    return NextResponse.json({ error: "Nominee not found." }, { status: 404 });
  }

  const amount = Number(event.pricePerVote) * voteCount;
  const reference = `cv_${randomUUID().replace(/-/g, "")}`;

  await db.insert(payments).values({
    eventId: event.id,
    nomineeId: nominee.id,
    paystackReference: reference,
    // Normalized so a voter who later signs in to see their vote history
    // matches regardless of which format they typed at checkout.
    voterPhone: phone ? normalizePhone(phone) : undefined,
    voterEmail: email,
    voteCount,
    amount: amount.toFixed(2),
    currency: event.currency,
    status: "pending",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const result = await initializeTransaction({
    email: email || "voter@uvote.app",
    amountKobo: Math.round(amount * 100),
    currency: event.currency,
    reference,
    callbackUrl: `${appUrl}/api/checkout/callback`,
    metadata: { eventSlug: slug, nomineeId, voteCount },
  });

  return NextResponse.json({
    authorizationUrl: result.authorizationUrl,
    reference: result.reference,
  });
}
