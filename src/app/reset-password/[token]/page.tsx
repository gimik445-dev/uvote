import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { Logo } from "@/components/logo";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Reset your password — uVote" };

// A read-only check — this does NOT mark the token used (that only happens
// once the POST to /api/auth/reset-password actually succeeds, see that
// route). Otherwise a link-scanning email client or a page reload alone
// would burn the single-use token before the person ever set a password.
export default async function ResetPasswordPage({
  params,
}: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  const tokenHash = hashPasswordResetToken(token);

  const row = await db.query.passwordResetTokens.findFirst({
    where: and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)),
  });

  const valid = !!row && row.expiresAt > new Date();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 py-16">
      <div className="mb-6">
        <Logo />
      </div>

      {valid ? (
        <>
          <h1 className="text-2xl font-extrabold mb-1">Choose a new password</h1>
          <p className="text-ink-dim text-sm mb-7">You&apos;ll sign in with it right after.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <div className="card p-8 w-full max-w-sm text-center">
          <div className="text-3xl mb-4">⏳</div>
          <h1 className="text-xl font-extrabold mb-2">This link has expired</h1>
          <p className="text-sm text-ink-dim leading-relaxed">
            Password reset links are single-use and expire an hour after they&apos;re sent. Head
            back to the login page and request a fresh one.
          </p>
        </div>
      )}
    </main>
  );
}
