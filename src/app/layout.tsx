import type { Metadata } from "next";
import "./globals.css";

// Falls back to the current production URL so metadata (and the JSON-LD
// below) still resolves to absolute URLs in local/preview environments
// that don't set this env var.
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uvote-three.vercel.app";

const title = "uVote — Pay-Per-Vote Fundraising Platform";
const description =
  "Secure, real-time pay-per-vote fundraising for awards nights, pageants and fundraising events — for schools, churches, clubs and community groups. Mobile money and card checkout, no app required.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Not using a title.template here — every existing page already appends
  // its own "— uVote" suffix by hand (see e.g. app/about/page.tsx), and a
  // template would double that suffix on top.
  title,
  description,
  keywords: [
    "uVote",
    "pay-per-vote",
    "fundraising platform Ghana",
    "school fundraising",
    "church fundraising",
    "pageant voting",
    "awards night voting",
    "mobile money voting",
  ],
  applicationName: "uVote",
  authors: [{ name: "uVote" }],
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "uVote",
    title,
    description,
    locale: "en_GH",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "uVote — Pay-Per-Vote Fundraising Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    // Proves ownership to Google Search Console (URL-prefix property for
    // uvote-three.vercel.app) so the sitemap can be submitted. Safe to
    // publish — this token only proves control of the page, it can't be
    // used to take any action on the site or the Search Console account.
    google: "2NbNU1j1xCrJRvboyEWCWMg8UJ56GMR2ex9xG2vRfz8",
  },
};

// Organization + WebSite structured data (JSON-LD). This is what lets
// Google associate the uVote name/logo with this site for brand searches
// and knowledge-panel-style results — separate from the favicon shown next
// to a link, which browsers/search engines pick up on their own.
function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "uVote",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        description,
      },
      {
        "@type": "WebSite",
        name: "uVote",
        url: siteUrl,
        description,
        publisher: { "@type": "Organization", name: "uVote" },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- static JSON we build above, no user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <StructuredData />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
