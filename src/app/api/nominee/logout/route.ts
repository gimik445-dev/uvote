import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NOMINEE_SESSION_COOKIE } from "@/lib/nominee-auth";

export async function POST() {
  const store = await cookies();
  store.delete(NOMINEE_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
