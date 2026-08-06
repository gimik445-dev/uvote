import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { settlePayment } from "@/lib/vote-settlement";

// Paystack calls this server-to-server whenever a transaction's status
// changes. This is the authoritative confirmation path — the browser
// callback (api/checkout/callback) gives the voter a fast redirect, but a
// voter who closes their browser mid-payment still gets their vote counted
// because Paystack retries this webhook independently of the browser.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    // In local/test mode (no PAYSTACK_SECRET_KEY configured) signatures
    // can't be verified — reject rather than silently trusting an
    // unauthenticated body once real keys are in place.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    if (reference) {
      await settlePayment(reference);
    }
  }

  return NextResponse.json({ received: true });
}
