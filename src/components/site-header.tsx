import Link from "next/link";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-center sm:justify-start">
          <Logo />
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-ink-dim">
          <Link href="/#events">Events</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/voter/login">My Votes</Link>
        </nav>
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:justify-end">
          {/* The nav above is desktop-only (hidden until md), so on phones
              — where most voters actually are — this is the only way to
              reach My Votes without it. Hidden again at md+ since the nav
              already shows it there. The md:hidden lives on this wrapper,
              not on the link itself — the link also carries the .btn class,
              whose plain-CSS `display: inline-flex` (declared later in the
              stylesheet than Tailwind's generated md:hidden rule) would
              otherwise win the cascade and keep it visible at md+. */}
          <div className="flex-1 sm:flex-none md:hidden">
            <Link href="/voter/login" className="btn btn-ghost btn-sm w-full px-4">
              My Votes
            </Link>
          </div>
          <Link href="/login" className="btn btn-ghost btn-sm flex-1 sm:flex-none px-4 sm:px-6">Staff Login</Link>
          <Link href="/register" className="btn btn-accent btn-sm flex-1 sm:flex-none px-4 sm:px-6">
            <span className="sm:hidden">Register</span>
            <span className="hidden sm:inline">Register Your Organization</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
