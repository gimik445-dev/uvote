import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uvote-three.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/voter/dashboard",
        "/nominee/dashboard",
        "/nominee/login-expired",
        "/verify-email-expired",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
