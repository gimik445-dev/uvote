import type { MetadataRoute } from "next";
import { getActiveEvents } from "@/lib/data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uvote-three.vercel.app";

// Static, always-public marketing/utility pages. Dashboards, API routes and
// login-expired/error pages are deliberately left out here and blocked in
// robots.ts — there's nothing for a search crawler to usefully index there.
const staticRoutes: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/guidelines", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/register", priority: 0.7, changeFrequency: "monthly" },
  { path: "/login", priority: 0.4, changeFrequency: "yearly" },
  { path: "/voter/login", priority: 0.7, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Live events are the actual content people search for ("uVote <event
  // name>"), so they matter more to a crawler than the static pages above.
  // Fail soft (no DB, cold start, etc.) so a hiccup here never 500s the
  // sitemap — it just falls back to the static routes for that request.
  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const events = await getActiveEvents();
    eventEntries = events.map((event) => ({
      url: `${siteUrl}/events/${event.slug}`,
      lastModified: event.createdAt,
      changeFrequency: "hourly",
      priority: 0.9,
    }));
  } catch {
    eventEntries = [];
  }

  return [...staticEntries, ...eventEntries];
}
