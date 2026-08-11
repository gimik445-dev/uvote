"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Auto-redirects to /login after a few seconds instead of leaving the
// person stuck on a static message they have to act on themselves — they
// can still resend a fresh verification email right from there. The delay
// (rather than an instant redirect) is so the message about *why* they
// landed here is actually readable before the page moves on.
export default function VerifyEmailExpiredPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/login"), 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="card p-8 max-w-sm text-center">
        <div className="text-3xl mb-4">⏳</div>
        <h1 className="text-xl font-extrabold mb-2">This link has expired</h1>
        <p className="text-sm text-ink-dim leading-relaxed mb-5">
          Verification links expire after a few days. Taking you to the login page, where you
          can use &quot;Resend verification email&quot; to get a fresh one.
        </p>
        <Link href="/login" className="text-brand font-bold text-sm">
          Go there now →
        </Link>
      </div>
    </main>
  );
}

