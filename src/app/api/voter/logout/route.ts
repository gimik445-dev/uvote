import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { VOTER_SESSION_COOKIE } from "@/lib/voter-auth";

export async function POST() {
  const store = await cookies();
  store.delete(VOTER_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
