import { createClient } from "@/lib/supabase/server";
import { fetchUpcomingMatches, fetchRecentResults } from "@/lib/matches/matches";
import { maybeSyncFixtures, getLastSyncedAt, readCapability, resolveCurrentSeason } from "@/lib/matches/sync";
import { MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID } from "@/lib/matches/provider";
import { jsonData, jsonError, type ResponseSource } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";

/**
 * GET /api/manchester-united/fixtures — public, read-only.
 *
 * ?season=2026 — optional, a start year (Phase 2A: switched from Phase 1's
 * "2024/25"-style label param to the numeric form section 12 of the
 * Multi-Season Architecture spec explicitly asks for — a real behavior
 * change from what Phase 1 shipped/reported, noted here rather than
 * silently). Omit to get every season on record, same as the Results
 * tab's "All seasons" default — unchanged from Phase 1.
 *
 * When a season IS given, this route also *targets* that season for
 * syncing (not just filtering already-cached data) — see maybeSyncFixtures's
 * optional `season` param. Before attempting that, it checks
 * football_capabilities for a known verdict first (coverage-aware
 * synchronization, Phase 2A sections 8-10): a season already recorded
 * `subscription_limited`/`not_supported` is never re-attempted — no claim,
 * no provider call, just the honest cached (likely empty) answer plus the
 * real reason why, surfaced in the response body so a caller understands
 * *why* rather than seeing a silently empty list.
 *
 * Still never calls API-Football directly — delegates to maybeSyncFixtures
 * (sync.ts), which only actually reaches the provider when it wins the
 * Supabase-persisted `claim_sync_slot` race and the cached data is
 * genuinely stale.
 */

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  if (!checkRateLimit(getClientIp(request), RATE_LIMIT, RATE_WINDOW_MS)) {
    return jsonError("Too many requests. Please slow down and try again shortly.", 429);
  }

  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  let requestedSeason: number | undefined;
  if (seasonParam !== null) {
    const parsed = Number(seasonParam);
    if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2200) {
      return jsonError("Invalid season parameter — expected a start year, e.g. ?season=2026.", 400);
    }
    requestedSeason = parsed;
  }

  const supabase = await createClient();

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "manchester-united")
    .single();

  if (clubError || !club) {
    console.error("[api/manchester-united/fixtures] club lookup failed:", clubError?.message);
    return jsonError("Match data is not available right now.", 503);
  }

  // The concrete season this request will actually try to sync — "the
  // requested one" if given, otherwise whatever maybeSyncFixtures itself
  // would default to (kept in lockstep via the same resolveCurrentSeason
  // sync.ts uses internally, not re-implemented here).
  const syncTargetSeason = requestedSeason ?? resolveCurrentSeason(new Date());

  const capability = await readCapability({
    teamId: MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID,
    season: syncTargetSeason,
    competitionExternalRef: null,
    feature: "fixtures",
  });

  const knownBlocked = capability.status === "subscription_limited" || capability.status === "not_supported";
  const syncResult = knownBlocked
    ? { synced: false as const, providerSucceeded: null }
    : await maybeSyncFixtures({ clubId: club.id, season: syncTargetSeason });

  // 200 comfortably covers this club's full real history today (see the
  // Match Centre "Results tab capped at 5" fix earlier this project) —
  // matches that same "fetch everything, no pagination UI exists
  // anywhere else in this app either" reasoning rather than introducing a
  // second, differently-capped data source here.
  const [{ matches: upcoming, error: upcomingError }, { matches: recent, error: recentError }] = await Promise.all([
    fetchUpcomingMatches(supabase, { clubId: club.id, season: requestedSeason, limit: 200 }),
    fetchRecentResults(supabase, { clubId: club.id, season: requestedSeason, limit: 200 }),
  ]);

  if (upcomingError || recentError) {
    console.error("[api/manchester-united/fixtures] fetch failed:", upcomingError, recentError);
    return jsonError("Couldn't load fixtures. Please try again.", 500);
  }

  const source: ResponseSource = !syncResult.synced ? "cache" : syncResult.providerSucceeded ? "api" : "cached-stale";
  const lastUpdated = (await getLastSyncedAt(`fixtures:${syncTargetSeason}`)) ?? new Date().toISOString();

  return jsonData(
    {
      upcoming,
      recent,
      // Surfaced so a caller requesting a season with no real coverage
      // sees *why* they got an empty list, not just an empty list — never
      // silently indistinguishable from "no matches happened."
      capability: requestedSeason !== undefined ? { season: requestedSeason, status: capability.status, reason: capability.reason } : null,
    },
    { source, lastUpdated },
  );
}
