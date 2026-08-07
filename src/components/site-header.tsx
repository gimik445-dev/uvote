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
        </nav>
        {/* My Votes lives only here — one single element, always rendered,
            never duplicated with anything in the nav above. It used to also
            appear as a nav link (shown only at md+) with a second copy here
            hidden at md+ to compensate — two elements coordinated by
            opposite breakpoints is exactly the kind of thing that shows
            both or neither depending on caching/zoom/viewport edge cases.
            One element with no breakpoint logic can't ever double up. */}
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:justify-end">
          <Link
            href="/voter/login"
            className="btn btn-ghost btn-sm flex-1 sm:flex-none px-4 sm:px-6 whitespace-nowrap"
          >
            My Votes
          </Link>
          <Link
            href="/login"
            className="btn btn-ghost btn-sm flex-1 sm:flex-none px-4 sm:px-6 whitespace-nowrap"
          >
            Staff Login
          </Link>
          <Link
            href="/register"
            className="btn btn-accent btn-sm flex-1 sm:flex-none px-4 sm:px-6 whitespace-nowrap"
          >
            <span className="sm:hidden">Register</span>
            <span className="hidden sm:inline">Register Your Organization</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
