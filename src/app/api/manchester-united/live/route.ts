import { createClient } from "@/lib/supabase/server";
import { fetchLiveMatches, fetchMatchById, fetchMatchLineups, type MatchDetail, type LineupEntry } from "@/lib/matches/matches";
import { maybeSyncMatchEvents, maybeSyncMatchLineups, getLastSyncedAt } from "@/lib/matches/sync";
import { jsonData, jsonError, type ResponseSource } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";

/**
 * GET /api/manchester-united/live — public, read-only.
 *
 * An empty `live: []` array is the normal, valid response whenever
 * Manchester United isn't currently playing — which, honestly, is what
 * this dataset will always return right now: every match this app has
 * ever synced is historical (see the api-football-free-tier-season-cap
 * memory — the current API-Football plan can't reach the real live
 * season). That's a data-provider limitation, not a bug in this route,
 * and it's documented here so it isn't rediscovered the hard way.
 *
 * Refresh cadence for whatever *is* live rides the same short
 * LIVE_EVENTS_TTL_MS path maybeSyncMatchEvents/maybeSyncMatchLineups
 * already use for a match flagged `isLive` — this route does not
 * introduce any polling of its own; a client polling this endpoint still
 * only ever produces a real provider call once per that same short
 * window, gated by the same Supabase claim as everything else.
 */

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

interface LiveMatchPayload {
  match: MatchDetail;
  lineups: LineupEntry[];
}

export async function GET(request: Request) {
  if (!checkRateLimit(getClientIp(request), RATE_LIMIT, RATE_WINDOW_MS)) {
    return jsonError("Too many requests. Please slow down and try again shortly.", 429);
  }

  const supabase = await createClient();

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "manchester-united")
    .single();

  if (clubError || !club) {
    console.error("[api/manchester-united/live] club lookup failed:", clubError?.message);
    return jsonError("Match data is not available right now.", 503);
  }

  const { matches: liveSummaries, error: liveError } = await fetchLiveMatches(supabase, { clubId: club.id });
  if (liveError) {
    console.error("[api/manchester-united/live] fetch failed:", liveError);
    return jsonError("Couldn't load live matches. Please try again.", 500);
  }

  if (liveSummaries.length === 0) {
    // Nothing to sync, nothing stale — a genuinely valid, common state.
    return jsonData({ live: [] as LiveMatchPayload[] }, { source: "cache", lastUpdated: new Date().toISOString() });
  }

  const live: LiveMatchPayload[] = [];
  let anyFailed = false;
  let anySynced = false;
  const syncedAtCandidates: (string | null)[] = [];

  for (const summary of liveSummaries) {
    const [eventsSync, lineupsSync] = await Promise.all([
      maybeSyncMatchEvents({ matchId: summary.id, externalRef: summary.externalRef, isLive: true }),
      maybeSyncMatchLineups({ matchId: summary.id, externalRef: summary.externalRef, isLive: true }),
    ]);
    if (eventsSync.synced || lineupsSync.synced) anySynced = true;
    if (eventsSync.providerSucceeded === false || lineupsSync.providerSucceeded === false) anyFailed = true;

    const [{ match }, { entries: lineups }] = await Promise.all([
      fetchMatchById(supabase, summary.id),
      fetchMatchLineups(supabase, summary.id),
    ]);
    if (match) live.push({ match, lineups });

    syncedAtCandidates.push(await getLastSyncedAt(`events:${summary.id}`), await getLastSyncedAt(`lineups:${summary.id}`));
  }

  const source: ResponseSource = !anySynced ? "cache" : anyFailed ? "cached-stale" : "api";
  const lastUpdated =
    syncedAtCandidates.filter((v): v is string => v !== null).sort().reverse()[0] ?? new Date().toISOString();

  return jsonData({ live }, { source, lastUpdated });
}
