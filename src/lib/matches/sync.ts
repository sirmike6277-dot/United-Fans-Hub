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
import { seasonForDate } from "./season";

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

/**
 * Real sync provenance for one `maybeSync*` call — internal to this
 * module and its direct callers (the new /api/manchester-united/* routes),
 * never serialized straight into a public API response. `synced` is true
 * only when *this specific call* won the claim and actually attempted a
 * sync; `providerSucceeded` is only meaningful when `synced` is true
 * (`null` otherwise — no attempt means no verdict on it). Exists so a
 * caller can report an honest `source: "cache" | "api" | "cached-stale"`
 * instead of guessing from whether Supabase happens to have data (data
 * can be present and stale at the same time — that distinction is exactly
 * what this type preserves).
 */
export interface SyncAttemptResult {
  synced: boolean;
  providerSucceeded: boolean | null;
}

/**
 * The season to sync when a caller doesn't name one explicitly. Dynamic by
 * default (see season.ts's seasonForDate — real production behavior:
 * August 2026 correctly resolves to 2026, not a value anyone had to
 * update by hand). `API_FOOTBALL_SEASON` remains purely an OPTIONAL dev/
 * testing override — Phase 2A: this project's own `.env.local` currently
 * sets it to 2024 specifically because that's the only season this
 * account's plan can reach (see the api-football-free-tier-season-cap
 * memory and football_capabilities' seeded rows), not because production
 * is meant to be locked to it. A real Vercel production deployment simply
 * shouldn't set this var at all, and the app will correctly track
 * whatever season is actually current from then on with no code change
 * required when a season rolls over.
 *
 * Exported so a caller that needs to know the resolved season *before*
 * deciding whether to sync at all (e.g. the fixtures REST route's
 * coverage-aware pre-check against football_capabilities) can compute the
 * exact same value maybeSyncFixtures itself will use, rather than
 * re-implementing this resolution logic a second time.
 */
export function resolveCurrentSeason(now: Date): number {
  const override = process.env.API_FOOTBALL_SEASON;
  if (override) {
    const parsed = Number(override);
    if (Number.isInteger(parsed)) return parsed;
  }
  return seasonForDate(now).startYear;
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

function fixtureToMatchRow(fixture: ProviderFixture, clubId: string, requestedSeason: number) {
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
    // Phase 2A: the provider's own league id — the real, stable
    // "which competition" identifier (see the migration's own comment on
    // this column for why the free-text `competition` name isn't enough).
    competition_external_ref: fixture.competitionExternalRef,
    // Prefer the provider's own league.season for this specific fixture —
    // it's the authoritative source, and in principle could occasionally
    // differ from the season this sync call was made *for* (e.g. a
    // fixture the provider itself files under a different season than
    // requested — rare, but real data should win over what we asked for).
    // Falls back to the requested season only when the provider didn't
    // report one at all, never to a re-derived guess from kickoff_at.
    season: fixture.season ?? requestedSeason,
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
 * this function) for one season — the current one by default (see
 * resolveCurrentSeason), or an explicit `season` when the caller wants a
 * specific one (Phase 2A — e.g. the fixtures REST route's `?season=`
 * param, or a future historical-season backfill). Still one provider call
 * per invocation, not one per fixture, to respect API-Football's daily
 * request cap.
 */
export async function syncFixtures({
  clubId,
  season,
  now = new Date(),
}: {
  clubId: string;
  season?: number;
  now?: Date;
}): Promise<SyncResult> {
  const resolvedSeason = season ?? resolveCurrentSeason(now);
  let fixtures: ProviderFixture[];
  try {
    fixtures = await fetchTeamFixtures({
      teamId: MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID,
      season: resolvedSeason,
    });
  } catch (err) {
    // Provider failure never touches existing rows — caller keeps serving
    // whatever is already cached in Supabase.
    return { ok: false, error: err instanceof Error ? err.message : "Fixture sync failed.", matchesUpserted: 0 };
  }

  if (fixtures.length === 0) {
    return { ok: true, error: null, matchesUpserted: 0 };
  }

  const rows = fixtures.map((f) => fixtureToMatchRow(f, clubId, resolvedSeason));

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
 * Realtime, no background poller) — "when did we last attempt a sync for
 * this key", persisted in Supabase (migration add_sync_status) rather than
 * a process-local in-memory Map (the original v1 implementation, and the
 * exact bug this replaces): an in-memory Map provides no real protection
 * once this app runs as concurrent Vercel serverless instances, each with
 * its own empty Map on a cold start — every instance would independently
 * decide "not stale, go fetch," multiplying real API-Football calls well
 * past the intended one-attempt-per-TTL-window throttle. `claim_sync_slot`
 * is a single atomic Postgres statement (INSERT ... ON CONFLICT DO UPDATE
 * ... WHERE ...), so of any number of concurrent callers for the same key,
 * exactly one gets `true` back — see the migration's own comments for the
 * full reasoning. Recorded on *attempt* (the claim itself), not only on
 * success, for the same reason the original in-memory version was: a
 * failing/rate-limited provider gets retried at most once per TTL window,
 * not on every page load.
 */
async function claimSyncSlot(key: string, ttlSeconds: number): Promise<boolean> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    // Fail CLOSED: if we can't even reach the lock table, the safe default
    // is "don't sync" (fall back to whatever's already cached), never
    // "sync anyway" — an unprotected burst of provider calls is a worse
    // outcome than a slightly-stale page.
    console.warn(`[matches/sync] claimSyncSlot(${key}): service client unavailable — ${err instanceof Error ? err.message : err}`);
    return false;
  }

  const { data, error } = await supabase.rpc("claim_sync_slot", { p_key: key, p_ttl_seconds: ttlSeconds });
  if (error) {
    console.warn(`[matches/sync] claimSyncSlot(${key}) failed — treating as not claimed: ${error.message}`);
    return false;
  }
  return data === true;
}

/**
 * Records the outcome of a sync attempt this caller already won the claim
 * for. Best-effort: a failure to *record* the outcome should never fail
 * the request that already has its data, so this only ever logs, never
 * throws.
 */
async function recordSyncResult(key: string, ok: boolean, error: string | null): Promise<void> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    console.warn(`[matches/sync] recordSyncResult(${key}): service client unavailable — ${err instanceof Error ? err.message : err}`);
    return;
  }

  // The generated RPC arg type is `p_error?: string` (optional, not
  // nullable — Supabase's codegen infers "optional" from the SQL
  // function's `default null`, but still types the JS side as
  // `string | undefined`, not `string | null`) — `?? undefined` bridges
  // that; the SQL function treats a genuinely-absent arg and an absent-
  // via-undefined arg identically.
  const { error: rpcError } = await supabase.rpc("record_sync_result", { p_key: key, p_ok: ok, p_error: error ?? undefined });
  if (rpcError) {
    console.warn(`[matches/sync] recordSyncResult(${key}) failed: ${rpcError.message}`);
  }
}

/** Shared row read behind readRecentFailure and getLastSyncedAt below — one query shape, two different narrow views onto it. Returns null on any failure (missing service client, RPC error) rather than throwing; both callers already treat "unknown" as their own safe default. */
async function readSyncStatusRow(key: string): Promise<{ lastAttemptedAt: string | null; lastSucceededAt: string | null; lastError: string | null } | null> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return null;
  }
  const { data } = await supabase
    .from("sync_status")
    .select("last_attempted_at, last_succeeded_at, last_error")
    .eq("key", key)
    .maybeSingle();
  if (!data) return null;
  return { lastAttemptedAt: data.last_attempted_at, lastSucceededAt: data.last_succeeded_at, lastError: data.last_error };
}

/**
 * Reads whether the most recent recorded attempt for `key` failed —
 * unconditionally (regardless of whether *this* request was the one that
 * attempted a sync), so a request that lost the claim race to another
 * instance still reports the real, current, cross-instance-correct
 * failure state rather than always reporting "no failure on record."
 * Used by maybeSyncMatchLineups's `recentlyFailed` (see its own doc
 * comment for why this distinction matters to PitchLineup's empty state).
 */
async function readRecentFailure(key: string): Promise<boolean> {
  const row = await readSyncStatusRow(key);
  return row?.lastError != null;
}

/**
 * Real, persisted "when did this key's data last actually get synced" —
 * for the /api/manchester-united/* routes' `lastUpdated` field (see
 * src/lib/api/response.ts). Deliberately NOT `new Date().toISOString()`,
 * which would only mean "when was this request handled," not "how fresh
 * is the underlying data" — the whole point of `lastUpdated` per the
 * approved spec is to let a frontend show a real "last updated X minutes
 * ago." Prefers `last_succeeded_at`; falls back to `last_attempted_at` if
 * this key has attempted but never yet succeeded (still more honest than
 * hiding that there's been trouble); returns null only if this key has
 * genuinely never been touched, in which case the caller decides its own
 * fallback (e.g. "now," clearly reasoned at the call site).
 */
export async function getLastSyncedAt(key: string): Promise<string | null> {
  const row = await readSyncStatusRow(key);
  return row?.lastSucceededAt ?? row?.lastAttemptedAt ?? null;
}

/**
 * Coverage-aware synchronization (Phase 2A, sections 8-10 of the spec) —
 * `football_capabilities` (migration add_multi_season_architecture) records
 * what this app has *actually verified* API-Football provides, per
 * team+season+competition+feature, so a real feature-specific sync
 * function can check "is this even worth attempting" before spending a
 * provider call, and never re-attempts something already known to be
 * blocked. A row here is written ONLY after a real attempt against the
 * live provider — nothing in this module ever writes a status it hasn't
 * actually observed.
 *
 * Only `readCapability`/`recordCapability` are built this phase — no
 * feature-specific checker (e.g. a hypothetical `checkStandingsAvailable`)
 * exists yet, because there is no standings sync to gate in the first
 * place (out of scope for Phase 2A; see the phase report). These two
 * functions are the general-purpose primitives any future feature's sync
 * path would call before/after its own first real attempt.
 */
export type CapabilityStatus =
  | "available"
  | "unavailable"
  | "subscription_limited"
  | "not_supported"
  | "not_yet_available"
  | "temporarily_unavailable"
  | "unknown";

export interface CapabilityKey {
  teamId: number;
  season: number;
  /** Null for a feature that isn't competition-scoped (e.g. "fixtures" — one call covers every competition a team plays that season). */
  competitionExternalRef: string | null;
  feature: string;
}

/**
 * The persisted verdict for this exact team+season+competition+feature
 * combination, if one has ever been recorded — never calls the provider
 * itself. Returns `status: "unknown"` (never checked, not "checked and
 * failed") when no row exists, so a caller always has a real status to
 * branch on without needing a separate null-check.
 */
export async function readCapability(key: CapabilityKey): Promise<{ status: CapabilityStatus; reason: string | null; checkedAt: string | null }> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return { status: "unknown", reason: null, checkedAt: null };
  }

  let query = supabase
    .from("football_capabilities")
    .select("status, reason, checked_at")
    .eq("team_id", key.teamId)
    .eq("season", key.season)
    .eq("feature", key.feature);
  query = key.competitionExternalRef === null ? query.is("competition_external_ref", null) : query.eq("competition_external_ref", key.competitionExternalRef);

  const { data } = await query.maybeSingle();
  if (!data) return { status: "unknown", reason: null, checkedAt: null };
  return { status: data.status as CapabilityStatus, reason: data.reason, checkedAt: data.checked_at };
}

/**
 * Records a real, verified capability verdict — the only sanctioned way a
 * row in `football_capabilities` should ever be written outside of the
 * migration's own initial seed (see add_multi_season_architecture, which
 * seeded exactly the facts already confirmed this session: fixtures/
 * events/lineups available for 2024, fixtures subscription_limited for
 * 2025 and 2026). `reason` should always be the real, specific evidence
 * (e.g. the provider's own literal error text), never a generic label —
 * matches this codebase's established convention of logging *why*, not
 * just *what*, for every honest-fallback state.
 */
export async function recordCapability(key: CapabilityKey, status: CapabilityStatus, reason: string | null): Promise<void> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    console.warn(`[matches/sync] recordCapability(${key.feature}, season ${key.season}): service client unavailable — ${err instanceof Error ? err.message : err}`);
    return;
  }

  const { error } = await supabase.from("football_capabilities").upsert(
    {
      team_id: key.teamId,
      season: key.season,
      competition_external_ref: key.competitionExternalRef,
      feature: key.feature,
      status,
      reason,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "team_id,season,competition_external_ref,feature" },
  );
  if (error) {
    console.warn(`[matches/sync] recordCapability(${key.feature}, season ${key.season}) failed: ${error.message}`);
  }
}

const FIXTURES_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — fixtures/scores/status change slowly outside of live play.
const LIVE_EVENTS_TTL_MS = 90 * 1000; // 90 seconds — only while a specific match is marked "live".
const SETTLED_EVENTS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — scheduled/finished matches' events rarely change.
const SQUAD_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — a squad changes on the order of days/weeks (transfers), not minutes; no cron needed, a manual/lazy refresh this infrequent is sufficient for V1.

/**
 * Called from the public /matches server component before reading from
 * Supabase, and from GET /api/manchester-united/fixtures. A no-op (just a
 * DB-backed claim check) when data was synced recently, or when another
 * concurrent request already claimed this key; otherwise performs one
 * provider call and upsert via the service-role client. Never throws — a
 * provider failure, a missing SUPABASE_SERVICE_ROLE_KEY, or a failure to
 * even reach the claim table, simply means the page falls back to
 * whatever is already cached in Supabase (fail-closed — see
 * claimSyncSlot).
 *
 * Phase 2A: the claim key is now `fixtures:<season>` (was a single bare
 * "fixtures" key covering every season combined — see the
 * add_multi_season_architecture migration, which also deletes that old
 * key). Season-scoped so syncing 2026 can never block syncing 2024, or
 * vice versa — a real problem the old global key would have caused the
 * moment more than one season's data needed to coexist. `season` is
 * optional — omit it for "whatever's currently current" (existing callers
 * do exactly this, so their behavior is unchanged); pass it explicitly to
 * target a specific season (e.g. the fixtures REST route's `?season=`).
 */
export async function maybeSyncFixtures({
  clubId,
  season,
}: {
  clubId: string;
  season?: number;
}): Promise<SyncAttemptResult> {
  const resolvedSeason = season ?? resolveCurrentSeason(new Date());
  const key = `fixtures:${resolvedSeason}`;
  const claimed = await claimSyncSlot(key, FIXTURES_TTL_MS / 1000);
  if (!claimed) return { synced: false, providerSucceeded: null };
  const result = await syncFixtures({ clubId, season: resolvedSeason });
  await recordSyncResult(key, result.ok, result.error);
  return { synced: true, providerSucceeded: result.ok };
}

/**
 * Called from the match detail page, and from GET
 * /api/manchester-united/fixtures/[fixtureId] and /live. Uses a much
 * shorter staleness window while the cached row says the match is live,
 * and a long one otherwise — the cheapest way to get near-live event
 * updates without polling, Realtime, or a background job.
 */
export async function maybeSyncMatchEvents({
  matchId,
  externalRef,
  isLive,
}: {
  matchId: string;
  externalRef: string | null;
  isLive: boolean;
}): Promise<SyncAttemptResult> {
  if (!externalRef) return { synced: false, providerSucceeded: null };
  const key = `events:${matchId}`;
  const ttlSeconds = (isLive ? LIVE_EVENTS_TTL_MS : SETTLED_EVENTS_TTL_MS) / 1000;
  const claimed = await claimSyncSlot(key, ttlSeconds);
  if (!claimed) return { synced: false, providerSucceeded: null };
  const result = await syncMatchEvents({ matchId, externalRef });
  await recordSyncResult(key, result.ok, result.error);
  return { synced: true, providerSucceeded: result.ok };
}

/**
 * Called from the match detail page alongside maybeSyncMatchEvents, and
 * from GET /api/manchester-united/fixtures/[fixtureId] and /live. Same
 * staleness reasoning as events — a lineup only firms up close to kickoff
 * and never changes once the match is settled, so a long TTL is safe.
 *
 * Returns `recentlyFailed` so the page can tell apart two very different
 * reasons a match might have zero lineup rows: the provider genuinely
 * hasn't published one yet (normal, temporary, no attempt has failed), vs
 * this app just tried to fetch it and the provider errored — in this
 * account's case, overwhelmingly the confirmed 10/minute or 100/day
 * request caps (see resolvePlayerId's doc comment), not a real "no lineup
 * exists" state. Read unconditionally from persisted state (see
 * readRecentFailure), not just when *this* request attempted a sync, so
 * a request that lost the claim race still reports the real, current,
 * cross-instance-correct failure state.
 */
export async function maybeSyncMatchLineups({
  matchId,
  externalRef,
  isLive,
}: {
  matchId: string;
  externalRef: string | null;
  isLive: boolean;
}): Promise<SyncAttemptResult & { recentlyFailed: boolean }> {
  if (!externalRef) return { synced: false, providerSucceeded: null, recentlyFailed: false };
  const key = `lineups:${matchId}`;
  const ttlSeconds = (isLive ? LIVE_EVENTS_TTL_MS : SETTLED_EVENTS_TTL_MS) / 1000;

  const claimed = await claimSyncSlot(key, ttlSeconds);
  let synced = false;
  let providerSucceeded: boolean | null = null;
  if (claimed) {
    const result = await syncMatchLineups({ matchId, externalRef });
    await recordSyncResult(key, result.ok, result.error);
    synced = true;
    providerSucceeded = result.ok;
  }

  const recentlyFailed = await readRecentFailure(key);
  return { synced, providerSucceeded, recentlyFailed };
}

/**
 * Called wherever the Manchester United squad is needed for prediction
 * selection (first scorer / Man of the Match). A no-op when synced within
 * the last 24 hours, or when another concurrent request already claimed
 * this key; otherwise one provider call, bulk-upserted. Never throws — a
 * provider failure simply means the page falls back to whatever squad is
 * already cached in Supabase (possibly empty on a genuinely first-ever
 * run, in which case the prediction form has no players to offer yet
 * until this succeeds). Return type deliberately stays `void` — no
 * current caller needs sync provenance for squad data, so this doesn't
 * take on SyncAttemptResult the way the other three maybeSync* functions
 * now do (smallest safe change; see the phase report).
 */
export async function maybeSyncSquad({ clubId }: { clubId: string }): Promise<void> {
  const claimed = await claimSyncSlot("squad", SQUAD_TTL_MS / 1000);
  if (!claimed) return;
  const result = await syncSquad({ clubId });
  await recordSyncResult("squad", result.ok, result.error);
}
