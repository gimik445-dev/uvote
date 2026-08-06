import "server-only";
import { cookies } from "next/headers";
import {
  NOMINEE_SESSION_COOKIE,
  verifyNomineeSession,
  type NomineeSessionPayload,
} from "./nominee-auth";

export async function getNomineeSession(): Promise<NomineeSessionPayload | null> {
  const store = await cookies();
  const token = store.get(NOMINEE_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyNomineeSession(token);
}

export async function requireNomineeSession(): Promise<NomineeSessionPayload> {
  const session = await getNomineeSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
