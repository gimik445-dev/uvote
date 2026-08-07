import "server-only";
import { cookies } from "next/headers";
import {
  VOTER_SESSION_COOKIE,
  verifyVoterSession,
  type VoterSessionPayload,
} from "./voter-auth";

export async function getVoterSession(): Promise<VoterSessionPayload | null> {
  const store = await cookies();
  const token = store.get(VOTER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyVoterSession(token);
}

export async function requireVoterSession(): Promise<VoterSessionPayload> {
  const session = await getVoterSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
