"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export function VoterHeader({ phone }: { phone: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/voter/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header className="border-b border-border">
      <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
        <Logo size="sm" />
        <div className="min-w-0 text-right">
          <div className="text-[11px] font-extrabold tracking-wide text-ink-mute uppercase">
            Signed in as
          </div>
          <span className="font-bold text-sm truncate">{phone}</span>
        </div>
        <button onClick={logout} className="btn btn-ghost btn-sm shrink-0">
          Log out
        </button>
      </div>
    </header>
  );
}
