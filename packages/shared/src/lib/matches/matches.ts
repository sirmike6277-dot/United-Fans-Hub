import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.types";

// Ported verbatim from src/lib/matches/matches.ts (web app) — only this
// import path differs. Diff against the original if the web version changes.
type AnySupabase = SupabaseClient<Database>;

export const UPCOMING_MATCHES_LIMIT = 10;
export const RECENT_RESULTS_LIMIT = 5;

/** Lean projection for fixture lists — no event embed, kept cheap since a list page never needs event detail. */
export const MATCH_SUMMARY_SELECT = `
  id,
  opponent_name,
  competition,
  competition_external_ref,
  season,
  kickoff_at,
  venue,
  status,
  home_score,
  away_score,
  is_home,
  external_ref,
  opponent_external_ref
` as const;

/** Full projection for a single match page — includes the event timeline and each event's player identity via an explicit FK-hinted embed (never a generic/polymorphic join). */
export const MATCH_DETAIL_SELECT = `
  ${MATCH_SUMMARY_SELECT},
  match_events (
    id,
    minute,
    event_type,
    detail,
    created_at,
    player:players!match_events_player_id_fkey ( id, full_name, position, shirt_number, photo_asset_ref )
  )
` as const;

export interface MatchSummary {
  id: string;
  opponentName: string;
  competition: string | null;
  /** API-Football's own numeric league id (Phase 2A) — the real, stable "which competition" identifier; `competition` above stays the free-text display label. Null for any row synced before this field existed (never backfilled by guessing from the name). */
  competitionExternalRef: string | null;
  /** This fixture's season as its start year (e.g. 2026 for "2026/27") — see season.ts for the shared label/formatting helper. The provider's own assignment where known, real-derived-from-kickoff-date for older rows synced before this column existed (see the add_multi_season_architecture migration) — never a placeholder. */
  season: number;
  kickoffAt: string;
  venue: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  isHome: boolean;
  externalRef: string | null;
  /** The opponent's own real API-Football team id (`matches.opponent_external_ref`) — captured at fixture-sync time, available immediately (never waits on a lineup). Used only to build TeamCrest's live CDN URL for the opponent; never a fabricated id. */
  opponentExternalRef: string | null;
}

export interface MatchEventPlayer {
  id: string;
  fullName: string;
  position: string | null;
  shirtNumber: number | null;
  photoAssetRef: string | null;
}

export interface MatchEvent {
  id: string;
  minute: number | null;
  eventType: string;
  detail: unknown;
  createdAt: string;
  player: MatchEventPlayer | null;
}

export interface MatchDetail extends MatchSummary {
  events: MatchEvent[];
}

interface MatchSummaryRow {
  id: string;
  opponent_name: string;
  competition: string | null;
  competition_external_ref: string | null;
  season: number;
  kickoff_at: string;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  is_home: boolean;
  external_ref: string | null;
  opponent_external_ref: string | null;
}

/** Raw shape of the embedded `player:players!...` object exactly as PostgREST returns it — snake_case, unconverted. Distinct from MatchEventPlayer (the normalized camelCase shape the UI consumes) on purpose: conflating the two previously meant `full_name`/`shirt_number`/`photo_asset_ref` were never actually renamed, so every event's primary player silently rendered as absent. */
interface MatchEventPlayerRow {
  id: string;
  full_name: string;
  position: string | null;
  shirt_number: number | null;
  photo_asset_ref: string | null;
}

interface MatchDetailRow extends MatchSummaryRow {
  match_events: {
    id: string;
    minute: number | null;
    event_type: string;
    detail: unknown;
    created_at: string;
    player: MatchEventPlayerRow | null;
  }[] | null;
}

function normalizePlayer(player: MatchEventPlayerRow | null): MatchEventPlayer | null {
  if (!player) return null;
  return {
    id: player.id,
    fullName: player.full_name,
    position: player.position,
    shirtNumber: player.shirt_number,
    photoAssetRef: player.photo_asset_ref,
  };
}

function normalizeSummary(row: MatchSummaryRow): MatchSummary {
  return {
    id: row.id,
    opponentName: row.opponent_name,
    competition: row.competition,
    competitionExternalRef: row.competition_external_ref,
    season: row.season,
    kickoffAt: row.kickoff_at,
    venue: row.venue,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    isHome: row.is_home,
    externalRef: row.external_ref,
    opponentExternalRef: row.opponent_external_ref,
  };
}

function normalizeDetail(row: MatchDetailRow): MatchDetail {
  return {
    ...normalizeSummary(row),
    events: (row.match_events ?? []).map((e) => ({
      id: e.id,
      minute: e.minute,
      eventType: e.event_type,
      detail: e.detail,
      createdAt: e.created_at,
      player: normalizePlayer(e.player),
    })),
  };
}

/**
 * Fixtures not yet finished — scheduled or currently live — soonest first.
 * Deliberately does not distinguish "live" further here; the UI derives its
 * own display treatment from `status`.
 */
export async function fetchUpcomingMatches(
  supabase: AnySupabase,
  { clubId, season, limit = UPCOMING_MATCHES_LIMIT }: { clubId: string; season?: number; limit?: number },
): Promise<{ matches: MatchSummary[]; error: string | null }> {
  let query = supabase
    .from("matches")
    .select(MATCH_SUMMARY_SELECT)
    .eq("club_id", clubId)
    .in("status", ["scheduled", "live"]);
  // Phase 2A: filtered at the DB query level against the real, stored
  // `season` column — not a post-fetch JS filter re-deriving season from
  // kickoff_at (the pre-Phase-2A approach, which risked disagreeing with
  // whatever the provider itself assigned a fixture to).
  if (season !== undefined) query = query.eq("season", season);
  const { data, error } = await query.order("kickoff_at", { ascending: true }).limit(limit);

  if (error) {
    return { matches: [], error: "Couldn't load upcoming fixtures. Please try again." };
  }

  return { matches: (data ?? []).map(normalizeSummary), error: null };
}

/** Completed (or otherwise settled) matches, most recent first. */
export async function fetchRecentResults(
  supabase: AnySupabase,
  { clubId, season, limit = RECENT_RESULTS_LIMIT }: { clubId: string; season?: number; limit?: number },
): Promise<{ matches: MatchSummary[]; error: string | null }> {
  let query = supabase
    .from("matches")
    .select(MATCH_SUMMARY_SELECT)
    .eq("club_id", clubId)
    .in("status", ["finished", "postponed", "cancelled"]);
  if (season !== undefined) query = query.eq("season", season);
  const { data, error } = await query.order("kickoff_at", { ascending: false }).limit(limit);

  if (error) {
    return { matches: [], error: "Couldn't load recent results. Please try again." };
  }

  return { matches: (data ?? []).map(normalizeSummary), error: null };
}

/**
 * Matches currently in progress — added for GET /api/manchester-united/
 * live (Production Football Data Architecture, Phase 1). Same shape and
 * conventions as fetchUpcomingMatches/fetchRecentResults right above;
 * `status = "live"` is its own narrower slice of what fetchUpcomingMatches
 * already includes (`in(["scheduled", "live"])`) rather than a
 * differently-derived concept. No existing caller needed this distinction
 * on its own before now — the /matches Server Component page shows
 * upcoming and recent, never a dedicated "live only" view.
 */
export async function fetchLiveMatches(
  supabase: AnySupabase,
  { clubId }: { clubId: string },
): Promise<{ matches: MatchSummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SUMMARY_SELECT)
    .eq("club_id", clubId)
    .eq("status", "live")
    .order("kickoff_at", { ascending: true });

  if (error) {
    return { matches: [], error: "Couldn't load live matches. Please try again." };
  }

  return { matches: (data ?? []).map(normalizeSummary), error: null };
}

/**
 * A single match with its full event timeline, ordered deterministically:
 * by minute first (nulls last — a real match event almost always has a
 * minute; only malformed/incomplete data would lack one), then by
 * created_at as a stable tiebreaker for same-minute events.
 */
export async function fetchMatchById(
  supabase: AnySupabase,
  matchId: string,
): Promise<{ match: MatchDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_DETAIL_SELECT)
    .eq("id", matchId)
    .order("minute", { ascending: true, nullsFirst: false, referencedTable: "match_events" })
    .order("created_at", { ascending: true, referencedTable: "match_events" })
    .single();

  if (error || !data) {
    return { match: null, error: null };
  }

  return { match: normalizeDetail(data as unknown as MatchDetailRow), error: null };
}

export interface LineupEntry {
  id: string;
  clubId: string;
  formation: string | null;
  isStarting: boolean;
  playerId: string | null;
  playerName: string;
  shirtNumber: number | null;
  /** From `players.position` (set by the squad sync) — the real recorded position, used to place this player in the right row of the pitch. Null for an opponent player never synced as part of Manchester United's own squad. */
  position: string | null;
  /**
   * API-Football's real per-player "row:col" tactical slot for this match
   * (see provider.ts's ProviderLineupEntry.grid, synced verbatim into
   * match_lineups.grid) — the provider's own authoritative shape for
   * *both* teams, not derived from our squad data. Null whenever the
   * provider itself didn't publish it (common for friendlies — never
   * fabricated when absent; PitchLineup falls back to a position-grouped
   * layout in that case).
   */
  grid: string | null;
  /**
   * `clubs.external_ref` — API-Football's own numeric team id (set for
   * every club this app has ever seen via resolveClubId in sync.ts, not
   * just Manchester United). Used only to build the provider's own crest
   * CDN URL (see TeamCrest) — this app stores no opponent crest
   * asset of its own. Null on the rare row where that resolution never
   * happened.
   */
  clubExternalRef: string | null;
}

interface LineupRow {
  id: string;
  club_id: string;
  formation: string | null;
  is_starting: boolean;
  player_id: string | null;
  player_name: string;
  shirt_number: number | null;
  grid: string | null;
  player: { position: string | null } | null;
  club: { external_ref: string | null } | null;
}

/** Both teams' real starting XI + substitutes bench for one match (see migration add_match_lineups) — empty when the provider hasn't published a lineup yet (common before kickoff), never fabricated. */
export async function fetchMatchLineups(
  supabase: AnySupabase,
  matchId: string,
): Promise<{ entries: LineupEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("match_lineups")
    .select(
      "id, club_id, formation, is_starting, player_id, player_name, shirt_number, grid, player:players!match_lineups_player_id_fkey ( position ), club:clubs!match_lineups_club_id_fkey ( external_ref )",
    )
    .eq("match_id", matchId);

  if (error) {
    return { entries: [], error: "Couldn't load the lineup. Please try again." };
  }

  const rows = (data ?? []) as unknown as LineupRow[];

  return {
    entries: rows.map((row) => ({
      id: row.id,
      clubId: row.club_id,
      formation: row.formation,
      isStarting: row.is_starting,
      playerId: row.player_id,
      playerName: row.player_name,
      shirtNumber: row.shirt_number,
      position: row.player?.position ?? null,
      grid: row.grid,
      clubExternalRef: row.club?.external_ref ?? null,
    })),
    error: null,
  };
}
