import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, events } from "@/db/schema";
import { settlePayment } from "@/lib/vote-settlement";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const payment = await db.query.payments.findFirst({
    where: eq(payments.paystackReference, reference),
  });
  if (!payment) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, payment.eventId),
  });

  const result = await settlePayment(reference);
  const outcome = result.status === "failed" ? "failed" : "success";

  return NextResponse.redirect(
    `${appUrl}/events/${event?.slug ?? ""}?vote=${outcome}&ref=${reference}`
  );
}
