/**
 * Lightweight, in-process sliding-window rate limiter for the public
 * /api/manchester-united/* routes (Production Football Data Architecture,
 * Phase 1).
 *
 * This is a SECONDARY defense only — it protects this app's own routes
 * (and the Supabase reads behind them) from a single client hammering a
 * single warm instance. It is explicitly NOT what protects the
 * API-Football quota: that protection is the atomic, Supabase-persisted
 * `claim_sync_slot` gate in sync.ts, which is correct across every
 * concurrent Vercel instance. This limiter, by contrast, is a plain
 * in-memory Map — exactly the kind of process-local state that sync.ts's
 * old staleness gate used to be (see that file's history) and exactly why
 * it doesn't provide cross-instance protection: a cold start gets a fresh,
 * empty Map, and concurrent requests landing on different instances don't
 * share counts. That's an accepted tradeoff here specifically because the
 * high-stakes resource (the provider quota) is already protected
 * elsewhere; this only needs to blunt an obvious single-source abuse
 * pattern against comparatively cheap Supabase reads, not guarantee an
 * exact global ceiling.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so a long-lived warm instance doesn't accumulate
// one entry per distinct IP forever — runs inline on new-bucket creation
// rather than a separate timer (no background interval to manage on a
// serverless function that may be frozen between invocations).
const MAX_TRACKED_KEYS = 5000;

/**
 * Returns true if `identifier` is allowed to proceed, false if it's over
 * `limit` requests within the trailing `windowMs`. A fixed-window
 * approximation (resets the whole window on the first request after it
 * elapses), not a true sliding log — deliberately simple, sufficient for
 * "blunt an obvious hammering client," not for billing-grade precision.
 */
export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(identifier, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/**
 * Best-effort client IP from the standard proxy header Vercel sets
 * (`x-forwarded-for`, leftmost value is the original client). Falls back
 * to a shared "unknown" bucket when absent (e.g. a local `next dev` run
 * with no proxy in front) — every unidentified caller then shares one
 * rate-limit bucket, which is the safe direction to fail in (more
 * restrictive, never a way to bypass the limit).
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return "unknown";
}
