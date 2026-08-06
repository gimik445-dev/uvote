import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Contact — uVote" };

export default function ContactPage() {
  return (
    <main className="flex-1">
      <SiteHeader />

      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-12">
        <span className="badge badge-mute mb-6">✉️ Contact</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mt-6 mb-6">
          We&apos;re happy to <span className="text-brand">help</span>
        </h1>
        <p className="text-lg text-ink-dim max-w-xl mx-auto">
          Payment issue, question about an event, or want to register your organization?
          Reach out and we&apos;ll get back to you.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid sm:grid-cols-3 gap-5 mb-8">
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">✉️</div>
            <h3 className="font-bold mb-1.5">Email support</h3>
            <a href="mailto:support@uvote.app" className="text-brand text-sm font-semibold break-all">
              support@uvote.app
            </a>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">💳</div>
            <h3 className="font-bold mb-1.5">Payment issue?</h3>
            <p className="text-sm text-ink-dim">
              Include your Paystack reference number for a faster response.
            </p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">🏛️</div>
            <h3 className="font-bold mb-1.5">Want to run an event?</h3>
            <Link href="/register" className="text-brand text-sm font-semibold">
              Register your organization →
            </Link>
          </div>
        </div>

        <div className="card p-8 text-center">
          <h3 className="font-bold mb-2">Before you write in</h3>
          <p className="text-sm text-ink-dim mb-4">
            Most questions about voting, pricing and payouts are answered on our FAQ page.
          </p>
          <Link href="/faq" className="btn btn-ghost btn-sm">Check the FAQ →</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
