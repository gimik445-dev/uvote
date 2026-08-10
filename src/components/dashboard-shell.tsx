import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function DashboardShell({
  activeLabel,
  roleLabel,
  identityLabel,
  links,
  children,
}: {
  activeLabel: string;
  roleLabel: string;
  identityLabel: string;
  links: { label: string; icon: string; href: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside
        className="w-[230px] shrink-0 border-r p-4 hidden md:block"
        style={{
          background: "var(--glass-bg)",
          borderColor: "var(--glass-border)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
        }}
      >
        <div className="px-2 mb-6 flex items-center justify-between">
          <Logo size="sm" />
          <ThemeToggle />
        </div>
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold mb-0.5 ${
              l.label === activeLabel ? "bg-brand/10 text-brand" : "text-ink-dim"
            }`}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
        <div
          className="mt-6 p-3 rounded-xl text-xs border"
          style={{ background: "var(--glass-bg-strong)", borderColor: "var(--glass-border)" }}
        >
          <div className="font-bold text-ink-dim mb-0.5">{identityLabel}</div>
          <div className="text-ink-mute">{roleLabel}</div>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex-1 p-6 md:p-8 max-w-6xl">{children}</div>
    </div>
  );
}
