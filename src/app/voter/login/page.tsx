export const metadata = { title: "My votes — uVote" };

import { Logo } from "@/components/logo";
import { VoterLoginClient } from "./voter-login-client";

export default function VoterLoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-sm w-full flex flex-col items-center">
        <div className="mb-6">
          <Logo size="sm" />
        </div>
        <div className="card p-8 w-full">
          <div className="text-3xl mb-4 text-center">🗳️</div>
          <h1 className="text-xl font-extrabold mb-2 text-center">See your votes</h1>
          <p className="text-sm text-ink-dim leading-relaxed text-center mb-6">
            Enter the phone number you used when voting and we&apos;ll text you a login code.
          </p>
          <VoterLoginClient />
        </div>
      </div>
    </main>
  );
}
