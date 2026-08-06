import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "uVote — Pay-Per-Vote Fundraising Platform",
  description:
    "Secure, real-time pay-per-vote fundraising for awards nights, pageants and fundraising events — for schools, churches, clubs and community groups.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
