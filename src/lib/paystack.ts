// Thin wrapper around the Paystack REST API.
//
// If PAYSTACK_SECRET_KEY is not set (e.g. local development before you've
// created a Paystack account), we fall back to a "test mode" that simulates
// a successful checkout without calling out to Paystack at all, so the rest
// of the app (vote counting, dashboards, payouts) can be built and demoed
// end-to-end. Swap in real keys and this same code talks to the real API.

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key && key.length > 0 ? key : null;
}

export function isPaystackConfigured(): boolean {
  return getSecretKey() !== null;
}

export type InitializeResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number; // Paystack amount is in the currency's smallest unit
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  const secretKey = getSecretKey();

  if (!secretKey) {
    // Test-mode stand-in: pretend Paystack accepted the transaction and
    // hand back a local URL that immediately "completes" the checkout.
    return {
      authorizationUrl: `${params.callbackUrl}?reference=${params.reference}&test_mode=1`,
      accessCode: "test_access_code",
      reference: params.reference,
    };
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    throw new Error(`Paystack initialize failed: ${res.status}`);
  }

  const json = await res.json();
  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

export type VerifyResult = {
  status: "success" | "failed" | "abandoned";
  amountKobo: number;
  currency: string;
  reference: string;
  channel: string | null;
  customerEmail: string | null;
};

export async function verifyTransaction(
  reference: string
): Promise<VerifyResult> {
  const secretKey = getSecretKey();

  if (!secretKey) {
    // Test mode: always report success so the local flow can be exercised.
    // "card" is used as a stand-in channel value here because it's a real
    // member of the payment_channel enum — Paystack's own sandbox channel
    // names ("test") are not valid values in our schema.
    return {
      status: "success",
      amountKobo: 0,
      currency: "GHS",
      reference,
      channel: "card",
      customerEmail: null,
    };
  }

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Paystack verify failed: ${res.status}`);
  }

  const json = await res.json();
  return {
    status: json.data.status,
    amountKobo: json.data.amount,
    currency: json.data.currency,
    reference: json.data.reference,
    channel: json.data.channel ?? null,
    customerEmail: json.data.customer?.email ?? null,
  };
}

// Verifies the `x-paystack-signature` header Paystack sends on every
// webhook call, so we never trust a webhook body we can't authenticate.
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  const secretKey = getSecretKey();
  if (!secretKey || !signature) return false;

  const crypto = await import("crypto");
  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  return hash === signature;
}
