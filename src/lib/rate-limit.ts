import "server-only";

// A simple in-memory sliding-window rate limiter, keyed by an arbitrary
// string (usually "ip:route"). This is intentionally lightweight — it's
// enough to stop a single bad actor hammering the checkout endpoint from
// one machine during a live event.
//
// Caveat for later: this only works because the app runs as one long-lived
// Node process. If this is ever deployed to a serverless/multi-instance
// platform (e.g. Vercel's default), each instance gets its own memory, so
// the limit effectively multiplies by instance count. At that point, swap
// this for a shared store (Upstash Redis / Vercel KV) using the same
// interface — everything that calls `checkRateLimit` stays unchanged.
const hits = new Map<string, number[]>();

// Periodically forget keys with no recent activity so this map doesn't
// grow forever on a long-running process.
const MAX_TRACKED_KEYS = 5000;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = hits.get(key) ?? [];
  const recent = existing.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const retryAfterMs = recent[0] + windowMs - now;
    hits.set(key, recent);
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => t <= windowStart)) hits.delete(k);
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
