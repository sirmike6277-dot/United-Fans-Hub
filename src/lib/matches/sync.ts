import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import {
  fetchTeamFixtures,
  fetchFixtureEvents,
  fetchFixtureLineups,
  fetchTeamSquad,
  fetchPlayerPosition,
  MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID,
  type ProviderFixture,
  type ProviderEvent,
} from "./provider";

/**
 * Server-only synchronization: API-Football → Supabase. Never imported by
 * client components — only by the sync Route Handler and directly by the
 * public /matches server components (see maybeSyncFixtures /
 * maybeSyncMatchEvents below). The browser never reads this module's
 * output directly; it reads the `matches`/`match_events` rows this writes,
 * via the ordinary public-read RLS policies (src/lib/matches/matches.ts).
 *
 * Writes always go through a dedicated service-role client
 * (src/lib/supabase/service.ts), not whatever session triggered the sync.
 * This matters: matches/players/match_events RLS intentionally restricts
 * writes to match_manager/super_admin, and the passive lazy-revalidation
 * path can be triggered by an anonymous visitor just loading a public
 * page — that visitor's own session has no write privilege on these
 * tables (correctly), so the sync's writes cannot run "as" them. A
 * system-level service-role client is the correct, standard tool for a
 * background/system process like this, and it is never exposed to client
 * code — see service.ts and the final report for the credential this
 * requires and does not yet have configured.
 *
 * Idempotency:
 * - matches: upserted on the existing unique `external_ref` constraint —
 *   safe, native Postgres ON CONFLICT.
 * - clubs (Phase 7B): opponent clubs are upserted on the unique
 *   `clubs.external_ref` constraint (migration 018) the same way — an
 *   atomic upsert, not a select-then-insert pair (see resolvePlayerId's
 *   comment for why that pattern isn't safe when the same external_ref is
 *   referenced repeatedly within one match's own event list).
 * - players: upserted on the unique `players.external_ref` constraint
 *   (migration 017) — see resolvePlayerId.
 * - match_events: has no provider-id column at all, so there's nothing to
 *   upsert against. Idempotency is instead achieved by replacing the full
 *   event set for one match on every sync (delete all match_events for
 *   that match_id, then insert the freshly-mapped set) — trivially
 *   idempotent (the same provider data always produces the same final
 *   rows) and self-correcting if the provider revises an event (e.g. a
 *   VAR overturn removing a card). Scoped tightly to one match_id, never
 *   touching other matches' events.
 *
 * Club attribution (Phase 7B): each event's `team.id` (already present in
 * the provider response) determines which club its player belongs to —
 * Manchester United's own events resolve to the existing, pre-seeded
 * Manchester United club row; every other team.id resolves to an opponent
 * club row, created from real provider data (team id + name) the first
 * time it's encountered and reused on every later reference. A player is
 * never attributed to Manchester United merely because the event occurred
 * in a Manchester United fixture.
 */

export interface SyncResult {
  ok: boolean;
  error: string | null;
  matchesUpserted: number;
}

function resolveCurrentSeason(now: Date): number {
  // Optional override for API-Football plans that don't cover the real
  // current season — the free tier's own error for this project is
  // explicit: "Free plans do not have access to this season, try from 2022
  // to 2024." Without this, every sync attempt fails silently (see
  // maybeSyncFixtures's never-throws contract) and /matches stays
  // permanently empty, which is indistinguishable from "sync is broken"
  // to anyone looking at the page. Set API_FOOTBALL_SEASON in the
  // deployment environment once the plan covers the true current season
  // again (or remove it entirely) — this is a deployment-environment
  // concern, not a code change.
  const override = process.env.API_FOOTBALL_SEASON;
  if (override) {
    const parsed = Number(override);
    if (Number.isInteger(parsed)) return parsed;
  }

  // API-Football identifies a season by the year it started in (e.g. the
  // 2026-27 season is `season=2026`). European domestic seasons start
  // around July/August, so before July we're still in the season that
  // started the previous calendar year.
  const month = now.getUTCMonth(); // 0-indexed
  return month >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function mapStatus(providerStatus: string): "scheduled" | "live" | "finished" | "postponed" | "cancelled" {
  const live = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
  const finished = new Set(["FT", "AET", "PEN"]);
  const postponed = new Set(["PST"]);
  const cancelled = new Set(["CANC", "ABD", "AWD", "WO"]);

  if (live.has(providerStatus)) return "live";
  if (finished.has(providerStatus)) return "finished";
  if (postponed.has(providerStatus)) return "postponed";
  if (cancelled.has(providerStatus)) return "cancelled";
  // Unknown/unmapped codes (including "NS"/"TBD") default to scheduled —
  // the safest neutral fallback; never silently mark something finished.
  return "scheduled";
}

function fixtureToMatchRow(fixture: ProviderFixture, clubId: string) {
  const isHome = fixture.homeTeamId === MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID;
  const opponentName = isHome ? fixture.awayTeamName : fixture.homeTeamName;
  const opponentTeamId = isHome ? fixture.awayTeamId : fixture.homeTeamId;

  return {
    club_id: clubId,
    opponent_name: opponentName,
    // The opponent's real API-Football team id — already present on every
    // fixture response, just not previously persisted. Lets an opponent
    // crest render (see TeamCrest) on every match surface as soon as
    // the fixture itself syncs, not only once a lineup is published.
    opponent_external_ref: String(opponentTeamId),
    competition: fixture.competitionName,
    kickoff_at: fixture.kickoffAtIso,
    venue: fixture.venueName,
    status: mapStatus(fixture.status),
    home_score: fixture.homeScore,
    away_score: fixture.awayScore,
    is_home: isHome,
    external_ref: String(fixture.fixtureId),
  };
}

/**
 * Syncs Manchester United's fixture list (all statuses — the caller's
 * matches.ts read layer separates upcoming vs. recent by status/date, not
 * this function) for the current season only, to respect API-Football's
 * free-tier daily request cap — one call per invocation, not one per
 * fixture.
 */
export async function syncFixtures({
  clubId,
  now = new Date(),
}: {
  clubId: string;
  now?: Date;
}): Promise<SyncResult> {
  let fixtures: ProviderFixture[];
  try {
    fixtures = await fetchTeamFixtures({
      teamId: MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID,
      season: resolveCurrentSeason(now),
    });
  } catch (err) {
    // Provider failure never touches existing rows — caller keeps serving
    // whatever is already cached in Supabase.
    return { ok: false, error: err instanceof Error ? err.message : "Fixture sync failed.", matchesUpserted: 0 };
  }

  if (fixtures.length === 0) {
    return { ok: true, error: null, matchesUpserted: 0 };
  }

  const rows = fixtures.map((f) => fixtureToMatchRow(f, clubId));

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync is not configured.", matchesUpserted: 0 };
  }

  const { error } = await supabase.from("matches").upsert(rows, { onConflict: "external_ref" });

  if (error) {
    return { ok: false, error: "Couldn't save synced fixtures.", matchesUpserted: 0 };
  }

  return { ok: true, error: null, matchesUpserted: rows.length };
}

/**
 * Syncs Manchester United's current squad (Phase 8 — needed so predictions
 * on an upcoming match, submitted before any match_events exist for it,
 * have a real, current player pool to select a first scorer / Man of the
 * Match from — match_events-derived players only exist after a match has
 * already been played, which is too late for a pre-match prediction).
 * One provider call, bulk-upserted on the existing unique
 * `players.external_ref` constraint — the exact same idempotent pattern
 * already proven for fixtures/players/clubs, just applied to a squad list
 * instead of match events. Never touches any player's club_id other than
 * Manchester United's own — this function only ever writes squad members
 * of `MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID`.
 */
export async function syncSquad({ clubId }: { clubId: string }): Promise<SyncResult> {
  let squad: Awaited<ReturnType<typeof fetchTeamSquad>>;
  try {
    squad = await fetchTeamSquad({ teamId: MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Squad sync failed.", matchesUpserted: 0 };
  }

  if (squad.length === 0) {
    return { ok: true, error: null, matchesUpserted: 0 };
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync is not configured.", matchesUpserted: 0 };
  }

  const now = new Date().toISOString();
  const externalRefs = squad.map((p) => p.externalRef);

  const rows = squad.map((p) => ({
    club_id: clubId,
    full_name: p.fullName,
    position: p.position,
    shirt_number: p.shirtNumber,
    external_ref: p.externalRef,
    squad_synced_at: now,
  }));

  const { error } = await supabase.from("players").upsert(rows, { onConflict: "external_ref" });

  if (error) {
    return { ok: false, error: "Couldn't save synced squad.", matchesUpserted: 0 };
  }

  // `players` also accumulates rows for anyone who ever appeared in a
  // historical match_event (see resolvePlayerId) and shares this same
  // club_id — without this, someone no longer on the real squad (sold,
  // released, loaned out) would stay forever selectable as a first-
  // scorer/MOTM prediction candidate. Clearing squad_synced_at for anyone
  // with this club_id who is absent from *this* fetch is what keeps the
  // eligible pool equal to the real current squad — it never touches
  // club_id/full_name, so historical event attribution is unaffected.
  const { error: clearError } = await supabase
    .from("players")
    .update({ squad_synced_at: null })
    .eq("club_id", clubId)
    .not("squad_synced_at", "is", null)
    .not("external_ref", "in", `(${externalRefs.join(",")})`);

  if (clearError) {
    return { ok: false, error: "Couldn't finalize squad sync.", matchesUpserted: rows.length };
  }

  return { ok: true, error: null, matchesUpserted: rows.length };
}

/** Derives a URL-safe slug from a real provider team name (never a fabricated one) — mirrors how Manchester United's own slug was hand-derived from its real name. */
function slugifyClubName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (combining diacritical marks)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves an API-Football team id to our `clubs.id`.
 *
 * Manchester United is special-cased to a lookup only: its club row is
 * pre-existing and curated (real emblem asset, name, slug — see migration
 * 002), and must never be overwritten or re-created by this resolver. If
 * its external_ref mapping is somehow missing (migration 018 not applied),
 * this throws rather than silently creating a second Manchester United
 * row.
 *
 * Any other team id is an opponent, resolved via an atomic upsert on the
 * unique `clubs.external_ref` (migration 018) — the same reasoning as
 * resolvePlayerId's atomic upsert: the same opponent's team id is
 * typically referenced by several events within one match (most of that
 * match's own players share the same team.id), so a separate
 * select-then-insert pair would hit the same read-after-write race
 * discovered in Phase 7A. Opponent clubs are always created with
 * `is_active: false` — migration 002 defines this table's original
 * purpose as "clubs this platform actively operates a community around"
 * (Manchester United only); an opponent discovered via fixture sync is
 * reference data for match/player display, not a new active platform
 * club. No logo/emblem is fabricated — `emblem_asset_ref` is left null.
 */
async function resolveClubId(
  supabase: ReturnType<typeof createServiceClient>,
  { teamId, teamName }: { teamId: number; teamName: string | null },
): Promise<string> {
  const externalRef = String(teamId);

  if (teamId === MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID) {
    const { data, error } = await supabase.from("clubs").select("id").eq("external_ref", externalRef).maybeSingle();
    if (error) {
      throw new Error(`Couldn't look up Manchester United's club row: ${error.message}`);
    }
    if (!data) {
      throw new Error(
        "Manchester United's club row has no external_ref mapping — migration 018 must be applied before match sync can run.",
      );
    }
    return data.id;
  }

  if (!teamName) {
    throw new Error(`Couldn't resolve opponent club ${externalRef}: provider gave no team name.`);
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("clubs")
    .upsert(
      { name: teamName, slug: slugifyClubName(teamName), external_ref: externalRef, is_active: false },
      { onConflict: "external_ref" },
    )
    .select("id")
    .single();

  if (upsertError) {
    throw new Error(`Couldn't resolve club ${externalRef}: ${upsertError.message}`);
  }
  return upserted.id;
}

/**
 * Resolves a provider player id to our `players.id`, creating or updating
 * the row as needed (application-level idempotent upsert — see file
 * header). Returns null if the provider gave no player id or the write
 * fails, in which case the caller stores the event with player_id: null
 * rather than failing the whole sync over one unresolved player.
 */
async function resolvePlayerId(
  supabase: ReturnType<typeof createServiceClient>,
  {
    clubId,
    providerId,
    fullName,
    backfillPosition = true,
  }: {
    clubId: string;
    providerId: number;
    fullName: string | null;
    /**
     * Whether it's worth spending one of the day's limited provider calls
     * (see below) backfilling this specific player's position right now.
     * Defaults to true for syncMatchEvents' call site (a real, notable
     * actor — scored/booked/subbed — worth having position data for
     * regardless). syncMatchLineups passes `entry.isStarting` explicitly:
     * a substitute who never comes on only ever appears as plain text in
     * SubstitutePlayersPanel (see PitchLineup.tsx — only the *starting* XI
     * ever reaches buildTeamFormation/the pitch), so paying an API call to
     * place them on a pitch they never render on is pure waste. A real,
     * measured problem this fixes: this app's plan caps at 10 requests/
     * minute AND 100/day (confirmed via the provider's own /status
     * endpoint headers) — a single brand-new opponent's full lineup entry
     * list (11 starters + a typical 7-12 named substitutes) could
     * previously burn up to ~20+ of that day's 100 calls on ONE match
     * visit, most of them on players nothing in this app ever needs a
     * position for. Restricting to starters only roughly halves that
     * worst case, spending the scarce daily budget on what a visitor is
     * actually looking at (the pitch) rather than the bench list.
     */
    backfillPosition?: boolean;
  },
): Promise<string | null> {
  const externalRef = String(providerId);

  // A real player commonly appears more than once as the primary actor
  // within one match's own event list (e.g. scoring twice, or scoring
  // then later being substituted off) — resolvePlayerId is therefore
  // called repeatedly for the same external_ref within a single
  // sequential loop (see syncMatchEvents). A separate SELECT-then-INSERT
  // pair is not safe here even with correct error handling: a SELECT
  // immediately following an earlier, already-committed INSERT for the
  // same external_ref (via a distinct PostgREST round-trip) was observed,
  // during Phase 7A verification, to sometimes still report "not found",
  // leading the very next INSERT to fail on the unique constraint. A
  // single atomic upsert (relying on the players_external_ref_key unique
  // constraint added in migration 017) has no such window — Postgres
  // resolves the conflict against the table's real current state in one
  // statement, so it can never be fooled by a stale intermediate read.
  if (!fullName) {
    // Nothing to write for a brand-new player without a name, but it may
    // already exist from an earlier reference earlier in this same
    // match's event list — a plain lookup covers that narrower case.
    const { data: existing, error: lookupError } = await supabase
      .from("players")
      .select("id")
      .eq("external_ref", externalRef)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Couldn't look up player ${externalRef}: ${lookupError.message}`);
    }
    return existing?.id ?? null;
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("players")
    .upsert({ club_id: clubId, full_name: fullName, external_ref: externalRef }, { onConflict: "external_ref" })
    .select("id, position")
    .single();

  // Never silently treat a real database error as "player not found" —
  // that conflation is exactly what caused the original duplication
  // defect. Surfaced here so the caller fails this sync attempt safely
  // instead of proceeding with an unresolved or incorrect player_id.
  if (upsertError) {
    throw new Error(`Couldn't resolve player ${externalRef}: ${upsertError.message}`);
  }
  if (!upserted) return null;

  // A real, previously-missing fix: this is the ONE place every player
  // row — opponent or Man Utd, lineup or event actor — gets created, so
  // it's the right place to backfill real position too, rather than only
  // ever doing it for Man Utd's own squad via a separate manual pass. Only
  // attempted when still unknown (never re-fetched for a player who
  // already has one) and when the caller says it's actually worth spending
  // a call on right now (see `backfillPosition` above), and always
  // best-effort: fetchPlayerPosition catches its own failures and returns
  // null rather than throwing, so a rate-limited or network-failed lookup
  // just leaves this row exactly as honest as it was before — position
  // stays null, picked up automatically on this player's next sync
  // (another lineup/event referencing them) rather than requiring another
  // manual backfill pass. The real, confirmed constraints this works
  // within (read from this account's own /status response headers, not
  // guessed): 10 requests/minute AND a separate 100 requests/DAY cap —
  // this app's plan is entry-tier, so a side with many brand-new players
  // in one sync will only get some of them filled in immediately —
  // self-healing over subsequent syncs, not a one-shot guarantee.
  if (upserted.position === null && backfillPosition) {
    const position = await fetchPlayerPosition({ providerId, season: resolveCurrentSeason(new Date()) });
    if (position) {
      await supabase.from("players").update({ position }).eq("id", upserted.id);
    }
  }

  return upserted.id;
}

function mapEventType(providerType: string, providerDetail: string): "goal" | "yellow_card" | "red_card" | "substitution" | "var" | null {
  const type = providerType.toLowerCase();
  const detail = providerDetail.toLowerCase();

  // A real, previously-uncaught bug: API-Football files a missed penalty
  // under `type: "Goal"` too (`detail: "Missed Penalty"`) — the same
  // bucket as an actual goal. Mapping it straight through meant a player
  // who *missed* a penalty was rendered with a "scored" badge. There's no
  // "missed_penalty" event_type in this app's schema to route it to
  // instead (see the CHECK constraint), so — consistent with this
  // function's own existing rule for any other unrecognized shape — it's
  // dropped (logged, never silently miscategorized) rather than shown as
  // a goal it wasn't.
  if (type === "goal") return detail.includes("missed") ? null : "goal";
  if (type === "subst") return "substitution";
  if (type === "var") return "var";
  if (type === "card") {
    if (detail.includes("second yellow") || detail.includes("red")) return "red_card";
    if (detail.includes("yellow")) return "yellow_card";
  }
  // Deliberately not forced into one of the five fixed values — an
  // unrecognized shape is dropped rather than mis-categorized, and logged
  // server-side (never silently lost without a trace).
  return null;
}

/**
 * Replaces the full event set for one match with the provider's current
 * data (see file header for why "replace" rather than per-row upsert).
 * Never touches any other match's events.
 */
export async function syncMatchEvents({
  matchId,
  externalRef,
}: {
  matchId: string;
  externalRef: string;
}): Promise<SyncResult> {
  const fixtureId = Number(externalRef);
  if (!Number.isFinite(fixtureId)) {
    return { ok: false, error: "Match has no valid provider reference.", matchesUpserted: 0 };
  }

  let events: ProviderEvent[];
  try {
    events = await fetchFixtureEvents({ fixtureId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Event sync failed.", matchesUpserted: 0 };
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync is not configured.", matchesUpserted: 0 };
  }

  const rows: Database["public"]["Tables"]["match_events"]["Insert"][] = [];

  try {
    for (const event of events) {
      const eventType = mapEventType(event.type, event.detail);
      if (!eventType) {
        console.warn(`[matches/sync] Skipping unmappable event type "${event.type}"/"${event.detail}" for match ${matchId}`);
        continue;
      }

      // Club attribution is derived from this specific event's own
      // team.id — never from whichever club's fixture this sync call
      // happens to be running for. A player is never attributed to
      // Manchester United merely because the event occurred in a
      // Manchester United fixture.
      const playerId =
        event.playerId && event.teamId
          ? await resolvePlayerId(supabase, {
              clubId: await resolveClubId(supabase, { teamId: event.teamId, teamName: event.teamName }),
              providerId: event.playerId,
              fullName: event.playerName,
            })
          : null;

      rows.push({
        match_id: matchId,
        minute: event.minute,
        event_type: eventType,
        player_id: playerId,
        // Preserve provider detail that doesn't have its own column —
        // exact detail string, comments, and assist identity — rather than
        // discarding it once mapped to our five-value event_type.
        detail: {
          provider_type: event.type,
          provider_detail: event.detail,
          comments: event.comments,
          assist_player_id: event.assistPlayerId,
          assist_player_name: event.assistPlayerName,
          provider_event_id: event.providerEventId,
          // Stoppage-time minutes (e.g. 6 for "90+6") — real provider
          // data, no column of its own, so it rides in `detail` like the
          // other provider-only fields above. Read back by
          // formatEventMinute() (format.ts).
          minute_extra: event.minuteExtra,
        },
      });
    }
  } catch (err) {
    // A player-resolution failure (see resolvePlayerId) aborts here,
    // before the delete-and-reinsert below ever runs — this match's
    // existing cached events are left completely untouched rather than
    // being wiped and replaced with a partial/incorrect set.
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't resolve a player referenced by this match's events.",
      matchesUpserted: 0,
    };
  }

  const { error: deleteError } = await supabase.from("match_events").delete().eq("match_id", matchId);
  if (deleteError) {
    return { ok: false, error: "Couldn't refresh match events.", matchesUpserted: 0 };
  }

  if (rows.length === 0) {
    return { ok: true, error: null, matchesUpserted: 0 };
  }

  const { error: insertError } = await supabase.from("match_events").insert(rows);
  if (insertError) {
    return { ok: false, error: "Couldn't save synced match events.", matchesUpserted: 0 };
  }

  return { ok: true, error: null, matchesUpserted: rows.length };
}

/**
 * Replaces the full lineup (both teams' starting XI + substitutes bench)
 * for one match with the provider's current data — same "replace, don't
 * merge" idempotency reasoning as syncMatchEvents. Empty response (no
 * lineup published yet — common before/around kickoff) intentionally
 * leaves any existing rows alone rather than wiping them to nothing.
 */
export async function syncMatchLineups({
  matchId,
  externalRef,
}: {
  matchId: string;
  externalRef: string;
}): Promise<SyncResult> {
  const fixtureId = Number(externalRef);
  if (!Number.isFinite(fixtureId)) {
    return { ok: false, error: "Match has no valid provider reference.", matchesUpserted: 0 };
  }

  let entries: Awaited<ReturnType<typeof fetchFixtureLineups>>;
  try {
    entries = await fetchFixtureLineups({ fixtureId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lineup sync failed.", matchesUpserted: 0 };
  }

  if (entries.length === 0) {
    return { ok: true, error: null, matchesUpserted: 0 };
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync is not configured.", matchesUpserted: 0 };
  }

  const rows: Database["public"]["Tables"]["match_lineups"]["Insert"][] = [];

  try {
    for (const entry of entries) {
      const clubId = await resolveClubId(supabase, { teamId: entry.teamId, teamName: entry.teamName });
      const playerId = await resolvePlayerId(supabase, {
        clubId,
        providerId: entry.playerId,
        fullName: entry.playerName,
        // Only the starting XI ever needs a real position — see
        // resolvePlayerId's own doc comment for why this is the actual
        // fix to the daily-quota exhaustion problem, not just a note
        // about it.
        backfillPosition: entry.isStarting,
      });

      rows.push({
        match_id: matchId,
        club_id: clubId,
        formation: entry.formation,
        is_starting: entry.isStarting,
        player_id: playerId,
        player_name: entry.playerName,
        shirt_number: entry.shirtNumber,
        grid: entry.grid,
      });
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't resolve a player referenced by this match's lineup.",
      matchesUpserted: 0,
    };
  }

  const { error: deleteError } = await supabase.from("match_lineups").delete().eq("match_id", matchId);
  if (deleteError) {
    return { ok: false, error: "Couldn't refresh the match lineup.", matchesUpserted: 0 };
  }

  const { error: insertError } = await supabase.from("match_lineups").insert(rows);
  if (insertError) {
    return { ok: false, error: "Couldn't save the synced lineup.", matchesUpserted: 0 };
  }

  return { ok: true, error: null, matchesUpserted: rows.length };
}

// Note: provider.ts also exports fetchTeamSquad() for a future full-squad
// page — not needed here, since resolvePlayerId() above already resolves
// players lazily and on demand as match events reference them, at zero
// extra provider request cost.

/**
 * Lazy-revalidation staleness gate (approved v1 architecture — no cron, no
 * Realtime, no background poller). A process-local in-memory cache of "when
 * did we last attempt a sync for this key" — deliberately simple, with a
 * known, disclosed limitation: it does not persist across server restarts
 * and would not be shared across multiple server instances if this app is
 * ever horizontally scaled. That's an accepted v1 tradeoff (see final
 * report) rather than adding a `synced_at` column, since no such column
 * was in this phase's approved migration scope and the current deployment
 * is a single dev process. The timestamp is recorded on *attempt*, not
 * only on success, specifically so a failing/rate-limited provider gets
 * retried at most once per TTL window rather than on every page load.
 */
const lastSyncAttemptAt = new Map<string, number>();

function isStale(key: string, ttlMs: number): boolean {
  const last = lastSyncAttemptAt.get(key);
  return last === undefined || Date.now() - last > ttlMs;
}

function markAttempted(key: string): void {
  lastSyncAttemptAt.set(key, Date.now());
}

/**
 * Companion to lastSyncAttemptAt — remembers whether that most recent
 * attempt actually succeeded. Exists specifically so a page whose lineup
 * is empty can tell "the provider genuinely hasn't published one yet" (no
 * failed attempt on record) apart from "we just tried and the provider
 * errored" (rate-limited/quota-exhausted, most likely — see
 * maybeSyncMatchLineups). Same process-local, doesn't-survive-a-restart
 * tradeoff as lastSyncAttemptAt above; a restart just means the next visit
 * re-attempts and re-learns the real state rather than showing a stale
 * failure forever.
 */
const lastSyncFailed = new Map<string, boolean>();

function markResult(key: string, ok: boolean): void {
  lastSyncFailed.set(key, !ok);
}

const FIXTURES_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — fixtures/scores/status change slowly outside of live play.
const LIVE_EVENTS_TTL_MS = 90 * 1000; // 90 seconds — only while a specific match is marked "live".
const SETTLED_EVENTS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — scheduled/finished matches' events rarely change.
const SQUAD_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — a squad changes on the order of days/weeks (transfers), not minutes; no cron needed, a manual/lazy refresh this infrequent is sufficient for V1.

/**
 * Called from the public /matches server component before reading from
 * Supabase. A no-op (just an in-memory timestamp check) when data was
 * synced recently; otherwise performs one provider call and upsert via
 * the service-role client. Never throws — a provider failure, or a
 * missing SUPABASE_SERVICE_ROLE_KEY, simply means the page falls back to
 * whatever is already cached in Supabase.
 */
export async function maybeSyncFixtures({ clubId }: { clubId: string }): Promise<void> {
  if (!isStale("fixtures", FIXTURES_TTL_MS)) return;
  markAttempted("fixtures");
  await syncFixtures({ clubId });
}

/**
 * Called from the match detail page. Uses a much shorter staleness window
 * while the cached row says the match is live, and a long one otherwise —
 * the cheapest way to get near-live event updates without polling,
 * Realtime, or a background job.
 */
export async function maybeSyncMatchEvents({
  matchId,
  externalRef,
  isLive,
}: {
  matchId: string;
  externalRef: string | null;
  isLive: boolean;
}): Promise<void> {
  if (!externalRef) return;
  const key = `events:${matchId}`;
  const ttl = isLive ? LIVE_EVENTS_TTL_MS : SETTLED_EVENTS_TTL_MS;
  if (!isStale(key, ttl)) return;
  markAttempted(key);
  await syncMatchEvents({ matchId, externalRef });
}

/**
 * Called from the match detail page alongside maybeSyncMatchEvents. Same
 * staleness reasoning as events — a lineup only firms up close to kickoff
 * and never changes once the match is settled, so a long TTL is safe.
 *
 * Returns `recentlyFailed` so the page can tell apart two very different
 * reasons a match might have zero lineup rows: the provider genuinely
 * hasn't published one yet (normal, temporary, no attempt has failed), vs
 * this app just tried to fetch it and the provider errored — in this
 * account's case, overwhelmingly the confirmed 10/minute or 100/day
 * request caps (see resolvePlayerId's doc comment), not a real "no lineup
 * exists" state. A real, previously-hidden bug this fixes: PitchLineup's
 * empty state read "it usually lands shortly before kickoff" even for an
 * already-finished match whose fetch simply failed — misleading, since
 * that phrasing implies an upcoming match, not a currently-unreachable
 * historical one.
 */
export async function maybeSyncMatchLineups({
  matchId,
  externalRef,
  isLive,
}: {
  matchId: string;
  externalRef: string | null;
  isLive: boolean;
}): Promise<{ recentlyFailed: boolean }> {
  if (!externalRef) return { recentlyFailed: false };
  const key = `lineups:${matchId}`;
  const ttl = isLive ? LIVE_EVENTS_TTL_MS : SETTLED_EVENTS_TTL_MS;
  if (isStale(key, ttl)) {
    markAttempted(key);
    const result = await syncMatchLineups({ matchId, externalRef });
    markResult(key, result.ok);
  }
  return { recentlyFailed: lastSyncFailed.get(key) === true };
}

/**
 * Called wherever the Manchester United squad is needed for prediction
 * selection (first scorer / Man of the Match). A no-op when synced within
 * the last 24 hours; otherwise one provider call, bulk-upserted. Never
 * throws — a provider failure simply means the page falls back to
 * whatever squad is already cached in Supabase (possibly empty on a
 * genuinely first-ever run, in which case the prediction form has no
 * players to offer yet until this succeeds).
 */
export async function maybeSyncSquad({ clubId }: { clubId: string }): Promise<void> {
  if (!isStale("squad", SQUAD_TTL_MS)) return;
  markAttempted("squad");
  await syncSquad({ clubId });
}
