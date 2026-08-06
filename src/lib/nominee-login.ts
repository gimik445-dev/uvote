import "server-only";
import { db } from "@/db";
import { nomineeLoginTokens } from "@/db/schema";
import { generateLoginToken, LOGIN_TOKEN_TTL_DAYS } from "./nominee-auth";
import { sendSms } from "./sms";

// Issues a fresh single-use login token for a nominee and texts them the
// link. Called automatically right after an organizer adds a nominee (with
// a phone number), and again from the "Resend link" button if a nominee
// says they never got it or the link expired.
export async function issueAndSendLoginLink(params: {
  nomineeId: string;
  phone: string;
  displayName: string;
  baseUrl: string;
}): Promise<{ sent: boolean; testMode: boolean }> {
  const { token, tokenHash } = generateLoginToken();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(nomineeLoginTokens).values({
    nomineeId: params.nomineeId,
    tokenHash,
    expiresAt,
  });

  const link = `${params.baseUrl}/api/nominee/login/${token}`;
  const firstName = params.displayName.split(" ")[0];

  return sendSms({
    to: params.phone,
    message: `Hi ${firstName}, view your live uVote results here: ${link}`,
  });
}
