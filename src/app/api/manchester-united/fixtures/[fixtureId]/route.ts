import { createClient } from "@/lib/supabase/server";
import { fetchMatchById, fetchMatchLineups } from "@/lib/matches/matches";
import { maybeSyncMatchEvents, maybeSyncMatchLineups, getLastSyncedAt } from "@/lib/matches/sync";
import { jsonData, jsonError, type ResponseSource } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";

/**
 * GET /api/manchester-united/fixtures/[fixtureId] — public, read-only.
 *
 * `fixtureId` is this app's own match id — the same id space already used
 * by the existing /matches/[matchId] page (see matches.ts's MatchSummary/
 * MatchDetail — not a second, parallel identifier scheme for the same
 * data). A raw API-Football numeric fixture id was deliberately not used
 * here: this app's matches are looked up by its own primary key
 * everywhere else, and introducing a second lookup path (by
 * `external_ref`) for just this one route would be new surface area for
 * no real benefit — the existing page's own links already are this id.
 *
 * Mirrors src/app/matches/[matchId]/page.tsx's own fetch → sync → re-fetch
 * flow exactly, just returned as JSON instead of rendered.
 */

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function combineSource(attempts: { synced: boolean; providerSucceeded: boolean | null }[]): ResponseSource {
  const attempted = attempts.filter((a) => a.synced);
  if (attempted.length === 0) return "cache";
  // Any failed attempt among what was actually tried means the honest
  // answer is "some of this is a stale fallback" — never claim "api" for
  // a response that's partly a known-stale substitute.
  if (attempted.some((a) => a.providerSucceeded === false)) return "cached-stale";
  return "api";
}

export async function GET(request: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  if (!checkRateLimit(getClientIp(request), RATE_LIMIT, RATE_WINDOW_MS)) {
    return jsonError("Too many requests. Please slow down and try again shortly.", 429);
  }

  const { fixtureId } = await params;
  const supabase = await createClient();

  const { match: initialMatch } = await fetchMatchById(supabase, fixtureId);
  if (!initialMatch) {
    return jsonError("Fixture not found.", 404);
  }

  const isLive = initialMatch.status === "live";
  const [eventsSync, lineupsSync] = await Promise.all([
    maybeSyncMatchEvents({ matchId: initialMatch.id, externalRef: initialMatch.externalRef, isLive }),
    maybeSyncMatchLineups({ matchId: initialMatch.id, externalRef: initialMatch.externalRef, isLive }),
  ]);

  // Re-fetch after the (possible) sync so anything freshly-synced renders
  // in this same request, same reasoning as the existing page.
  const { match } = await fetchMatchById(supabase, fixtureId);
  const current = match ?? initialMatch;

  const { entries: lineupEntries, error: lineupsError } = await fetchMatchLineups(supabase, current.id);
  if (lineupsError) {
    console.error(`[api/manchester-united/fixtures/${fixtureId}] lineup fetch failed:`, lineupsError);
    return jsonError("Couldn't load this fixture. Please try again.", 500);
  }

  const source = combineSource([eventsSync, lineupsSync]);
  const [eventsSyncedAt, lineupsSyncedAt] = await Promise.all([
    getLastSyncedAt(`events:${current.id}`),
    getLastSyncedAt(`lineups:${current.id}`),
  ]);
  const lastUpdated =
    [eventsSyncedAt, lineupsSyncedAt].filter((v): v is string => v !== null).sort().reverse()[0] ?? new Date().toISOString();

  return jsonData(
    { match: current, lineups: lineupEntries, lineupSyncRecentlyFailed: lineupsSync.recentlyFailed },
    { source, lastUpdated },
  );
}
