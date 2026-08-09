import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, nominees, paymentChannelEnum } from "@/db/schema";
import { verifyTransaction } from "@/lib/paystack";

const KNOWN_PAYMENT_CHANNELS = new Set<string>(paymentChannelEnum.enumValues);

// Paystack's `channel` is a free-form string on their end, not a value we
// control — Drizzle will throw if we ever try to save one that isn't in
// our enum. Settling a payment (marking it paid, crediting the vote) must
// never fail just because of an unrecognized/new channel label, so this
// narrows to null instead of letting an unknown value reach the DB.
function isKnownPaymentChannel(
  channel: string | null
): channel is (typeof paymentChannelEnum.enumValues)[number] {
  return channel !== null && KNOWN_PAYMENT_CHANNELS.has(channel);
}

/**
 * The single choke point where a vote is ever recorded.
 *
 * Both the checkout-callback route and the Paystack webhook call this.
 * It always re-verifies the transaction directly with Paystack (never
 * trusts a client-supplied "it worked") and is idempotent: if the payment
 * has already been marked "success", it does nothing on a repeat call, so
 * a nominee's vote_count can never be double-incremented by a retried
 * webhook or a user refreshing the callback page.
 */
export async function settlePayment(reference: string): Promise<{
  status: "success" | "failed" | "already_settled" | "not_found";
  voteCount?: number;
}> {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.paystackReference, reference),
  });

  if (!payment) return { status: "not_found" };
  if (payment.status === "success") {
    return { status: "already_settled", voteCount: payment.voteCount };
  }

  const verified = await verifyTransaction(reference);

  if (verified.status !== "success") {
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.paystackReference, reference));
    return { status: "failed" };
  }

  // Mark the payment settled and bump the nominee's vote count atomically.
  // The WHERE clause only matches rows that are NOT already "success", so
  // if two settlement calls race (a retried webhook + the user's callback
  // page, say), only the first UPDATE actually matches a row — the second
  // gets back zero rows and skips incrementing the nominee's vote count.
  let didApply = false;
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(payments)
      .set({
        status: "success",
        verifiedAt: new Date(),
        // Paystack's real channel values are a fixed, known set (card,
        // mobile_money, ussd, bank, bank_transfer, qr, eft). Anything
        // outside what our enum recognizes is stored as null rather than
        // thrown at the DB layer — a payment must never fail to settle
        // just because of an unrecognized channel label.
        channel: isKnownPaymentChannel(verified.channel) ? verified.channel : null,
      })
      .where(
        and(
          eq(payments.paystackReference, reference),
          ne(payments.status, "success")
        )
      )
      .returning();

    if (updated.length === 0) return;
    didApply = true;

    await tx
      .update(nominees)
      .set({ voteCount: sql`${nominees.voteCount} + ${payment.voteCount}` })
      .where(eq(nominees.id, payment.nomineeId));
  });

  return {
    status: didApply ? "success" : "already_settled",
    voteCount: payment.voteCount,
  };
}
