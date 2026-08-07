import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-10">
      {/* Wave divider into the footer band — same brand indigo as the rest
          of the site, just a smooth curve instead of a straight edge. */}
      <svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className="block w-full h-[56px] sm:h-[84px]"
        style={{ marginBottom: "-1px" }}
        aria-hidden="true"
      >
        <path
          fill="var(--brand)"
          d="M0,45 C220,90 420,0 720,35 C1020,70 1220,10 1440,48 L1440,100 L0,100 Z"
        />
      </svg>

      <div className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-6 pb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <div className="font-extrabold mb-2">uVote</div>
            <p className="text-white/70 leading-relaxed">
              Pay-per-vote fundraising for awards nights, pageants and community events —
              for schools, churches, clubs and more.
            </p>
          </div>
          <div>
            <div className="font-bold text-white/55 uppercase text-[11px] tracking-wide mb-3">Platform</div>
            <div className="flex flex-col gap-2 text-white/85">
              <Link href="/about">About</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/guidelines">Guidelines</Link>
            </div>
          </div>
          <div>
            <div className="font-bold text-white/55 uppercase text-[11px] tracking-wide mb-3">Account</div>
            <div className="flex flex-col gap-2 text-white/85">
              <Link href="/login">Staff Login</Link>
              <Link href="/register">Register your organization</Link>
            </div>
          </div>
          <div>
            <div className="font-bold text-white/55 uppercase text-[11px] tracking-wide mb-3">Support</div>
            <div className="flex flex-col gap-2 text-white/85">
              <Link href="/contact">Contact</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/15">
          <div className="max-w-6xl mx-auto px-6 py-5 text-xs text-white/60 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              © {new Date().getFullYear()} uVote. Built for schools, churches, clubs and community groups.
            </span>
            <span>
              Emoji graphics by{" "}
              <a href="https://github.com/jdecked/twemoji" className="underline">
                Twemoji
              </a>
              , licensed under{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/" className="underline">
                CC-BY 4.0
              </a>
              .
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
