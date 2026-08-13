/**
 * API-Football (api-sports.io) client — SERVER-ONLY. Must only ever be
 * imported from a Route Handler or another server-only module (sync.ts),
 * never from a "use client" component.
 *
 * This project doesn't have the `server-only` package installed (checked —
 * not a dependency, not in node_modules), so a build-time import guard
 * isn't available without adding a new dependency, which wasn't approved
 * for this task. Two things stand in for it instead: (1) the runtime check
 * below, which throws immediately if this module is ever evaluated in a
 * browser; (2) more importantly, `API_FOOTBALL_KEY` is a plain (non-
 * `NEXT_PUBLIC_`) env var, which Next.js never inlines into client
 * bundles — so even if this module were mistakenly imported client-side,
 * `process.env.API_FOOTBALL_KEY` would simply evaluate to `undefined` in
 * the browser, not leak the real value. The key is never logged, never
 * included in a thrown error, and never returned to a caller.
 */
if (typeof window !== "undefined") {
  throw new Error("src/lib/matches/provider.ts is server-only and must not be imported into client code.");
}

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

// Manchester United's API-Football numeric team id — a public catalog
// identifier from API-Football's own team directory, not a secret.
// Verified live via GET /teams?search=Manchester United during Phase 7
// verification: id 33, name "Manchester United", country "England".
export const MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID = 33;

export class ApiFootballConfigError extends Error {}
export class ApiFootballRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

function getApiFootballKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    // Deliberately generic — never echoes env var contents, and there are
    // none to echo here anyway since the var is simply unset.
    throw new ApiFootballConfigError(
      "API_FOOTBALL_KEY is not configured on the server. Set it in the deployment environment (never NEXT_PUBLIC_) before match synchronization can run.",
    );
  }
  return key;
}

async function apiFootballGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const key = getApiFootballKey();
  const url = new URL(`${API_FOOTBALL_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "x-apisports-key": key,
      },
      // Fixtures/events change slowly enough that Next.js's own fetch cache
      // would just add a second, redundant cache layer on top of the
      // Supabase-side lazy-revalidation cache this module feeds — disabled
      // here so staleness is controlled in exactly one place (sync.ts).
      cache: "no-store",
    });
  } catch {
    // Network-level failure (DNS, timeout, connection reset) — never
    // include the request URL's query string (it doesn't contain the key,
    // which is header-only, but keep the message minimal regardless).
    throw new ApiFootballRequestError("Could not reach API-Football.");
  }

  if (!response.ok) {
    // Body is not read/forwarded here — some providers echo request
    // metadata in error bodies, and there's no need to risk it.
    throw new ApiFootballRequestError(`API-Football request failed (${response.status}).`, response.status);
  }

  const json = (await response.json()) as { response?: unknown; errors?: unknown };

  // API-Football returns HTTP 200 even for some error conditions (invalid
  // key, quota exceeded), surfaced instead in a non-empty `errors` object.
  if (json.errors && typeof json.errors === "object" && Object.keys(json.errors).length > 0) {
    throw new ApiFootballRequestError("API-Football reported an error for this request.");
  }

  if (!("response" in json)) {
    throw new ApiFootballRequestError("Unexpected response shape from API-Football.");
  }

  return json.response as T;
}

export interface ProviderFixture {
  fixtureId: number;
  status: string; // API-Football short status code, e.g. "NS", "1H", "FT"
  kickoffAtIso: string;
  venueName: string | null;
  competitionName: string | null;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
}

/** Validates and narrows one raw fixture object from API-Football's `/fixtures` response into ProviderFixture, or returns null if required fields are missing/malformed — never throws on a single bad row, so one malformed fixture can't abort an entire sync batch. */
function parseFixture(raw: unknown): ProviderFixture | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const fixture = r.fixture as Record<string, unknown> | undefined;
  const league = r.league as Record<string, unknown> | undefined;
  const teams = r.teams as Record<string, unknown> | undefined;
  const goals = r.goals as Record<string, unknown> | undefined;
  const home = teams?.home as Record<string, unknown> | undefined;
  const away = teams?.away as Record<string, unknown> | undefined;
  const status = fixture?.status as Record<string, unknown> | undefined;
  const venue = fixture?.venue as Record<string, unknown> | undefined;

  const fixtureId = fixture?.id;
  const kickoff = fixture?.date;
  const homeId = home?.id;
  const awayId = away?.id;

  if (
    typeof fixtureId !== "number" ||
    typeof kickoff !== "string" ||
    typeof homeId !== "number" ||
    typeof awayId !== "number" ||
    typeof home?.name !== "string" ||
    typeof away?.name !== "string"
  ) {
    return null;
  }

  return {
    fixtureId,
    status: typeof status?.short === "string" ? status.short : "NS",
    kickoffAtIso: kickoff,
    venueName: typeof venue?.name === "string" ? venue.name : null,
    competitionName: typeof league?.name === "string" ? league.name : null,
    homeTeamId: homeId,
    homeTeamName: home.name,
    awayTeamId: awayId,
    awayTeamName: away.name,
    homeScore: typeof goals?.home === "number" ? goals.home : null,
    awayScore: typeof goals?.away === "number" ? goals.away : null,
  };
}

/** Fixtures for one team across a season — used for both the upcoming and recent windows (the caller filters by date/status; keeping one fetch avoids two provider calls for what is fundamentally one dataset). */
export async function fetchTeamFixtures({
  teamId,
  season,
}: {
  teamId: number;
  season: number;
}): Promise<ProviderFixture[]> {
  const raw = await apiFootballGet<unknown[]>("/fixtures", { team: teamId, season });
  return raw.map(parseFixture).filter((f): f is ProviderFixture => f !== null);
}

export interface ProviderEvent {
  minute: number | null;
  /** API-Football's `time.extra` — stoppage-time minutes added onto `minute` (e.g. 6 for a goal at "90+6"). Real provider data, never computed/guessed; null whenever the provider didn't report stoppage time for this event. */
  minuteExtra: number | null;
  providerEventId: string;
  type: string; // raw API-Football `type`, e.g. "Goal", "Card", "subst", "Var"
  detail: string; // raw API-Football `detail`, e.g. "Normal Goal", "Yellow Card"
  comments: string | null;
  teamId: number | null;
  teamName: string | null;
  playerId: number | null;
  playerName: string | null;
  assistPlayerId: number | null;
  assistPlayerName: string | null;
}

function parseEvent(raw: unknown, index: number): ProviderEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const time = r.time as Record<string, unknown> | undefined;
  const team = r.team as Record<string, unknown> | undefined;
  const player = r.player as Record<string, unknown> | undefined;
  const assist = r.assist as Record<string, unknown> | undefined;

  if (typeof r.type !== "string" || typeof r.detail !== "string") return null;

  // API-Football events have no stable id of their own — a deterministic
  // composite (minute + type + detail + player + occurrence index) is
  // built here so the same event maps to the same identifier across
  // repeated syncs, which is what makes the idempotent replace-per-match
  // strategy in sync.ts actually safe.
  const minute = typeof time?.elapsed === "number" ? time.elapsed : null;
  const minuteExtra = typeof time?.extra === "number" ? time.extra : null;
  const providerEventId = [minute, r.type, r.detail, player?.id, index].join(":");

  return {
    minute,
    minuteExtra,
    providerEventId,
    type: r.type,
    detail: r.detail,
    comments: typeof r.comments === "string" ? r.comments : null,
    teamId: typeof team?.id === "number" ? team.id : null,
    teamName: typeof team?.name === "string" ? team.name : null,
    playerId: typeof player?.id === "number" ? player.id : null,
    playerName: typeof player?.name === "string" ? player.name : null,
    assistPlayerId: typeof assist?.id === "number" ? assist.id : null,
    assistPlayerName: typeof assist?.name === "string" ? assist.name : null,
  };
}

/** All events for one fixture (goals, cards, substitutions, VAR reviews). */
export async function fetchFixtureEvents({ fixtureId }: { fixtureId: number }): Promise<ProviderEvent[]> {
  const raw = await apiFootballGet<unknown[]>("/fixtures/events", { fixture: fixtureId });
  return raw.map((r, i) => parseEvent(r, i)).filter((e): e is ProviderEvent => e !== null);
}

export interface ProviderLineupEntry {
  teamId: number;
  teamName: string;
  formation: string | null;
  isStarting: boolean;
  playerId: number;
  playerName: string;
  shirtNumber: number | null;
  grid: string | null;
}

function parseLineupSide(raw: unknown, isStarting: boolean): ProviderLineupEntry[] {
  if (typeof raw !== "object" || raw === null) return [];
  const r = raw as Record<string, unknown>;
  const team = r.team as Record<string, unknown> | undefined;
  const teamId = team?.id;
  const teamName = team?.name;
  if (typeof teamId !== "number" || typeof teamName !== "string") return [];

  const formation = typeof r.formation === "string" ? r.formation : null;
  const entries = (isStarting ? r.startXI : r.substitutes) as unknown[] | undefined;

  return (entries ?? [])
    .map((entry): ProviderLineupEntry | null => {
      if (typeof entry !== "object" || entry === null) return null;
      const player = (entry as Record<string, unknown>).player as Record<string, unknown> | undefined;
      if (typeof player?.id !== "number" || typeof player.name !== "string") return null;
      return {
        teamId,
        teamName,
        formation,
        isStarting,
        playerId: player.id,
        playerName: player.name,
        shirtNumber: typeof player.number === "number" ? player.number : null,
        grid: typeof player.grid === "string" ? player.grid : null,
      };
    })
    .filter((e): e is ProviderLineupEntry => e !== null);
}

/** Both teams' starting XI + substitutes bench for one fixture. Returns [] (not an error) for a fixture the provider has no lineup for yet — common until close to/at kickoff. */
export async function fetchFixtureLineups({ fixtureId }: { fixtureId: number }): Promise<ProviderLineupEntry[]> {
  const raw = await apiFootballGet<unknown[]>("/fixtures/lineups", { fixture: fixtureId });
  return raw.flatMap((side) => [...parseLineupSide(side, true), ...parseLineupSide(side, false)]);
}

export interface ProviderPlayer {
  externalRef: string;
  fullName: string;
  position: string | null;
  shirtNumber: number | null;
}

/** Squad list for a team — used to resolve player identities referenced by fixture events into `players` rows keyed by external_ref. */
export async function fetchTeamSquad({ teamId }: { teamId: number }): Promise<ProviderPlayer[]> {
  const raw = await apiFootballGet<unknown[]>("/players/squads", { team: teamId });
  const entry = raw[0] as { players?: unknown[] } | undefined;
  const players = entry?.players ?? [];

  return players
    .map((p) => {
      if (typeof p !== "object" || p === null) return null;
      const r = p as Record<string, unknown>;
      if (typeof r.id !== "number" || typeof r.name !== "string") return null;
      return {
        externalRef: String(r.id),
        fullName: r.name,
        position: typeof r.position === "string" ? r.position : null,
        shirtNumber: typeof r.number === "number" ? r.number : null,
      };
    })
    .filter((p): p is ProviderPlayer => p !== null);
}

/**
 * A single player's real position, independent of current squad
 * membership — unlike `/players/squads`, which only lists a team's
 * *currently* rostered players. Needed because a real player who started
 * a real, already-synced match may since have transferred out (or, for an
 * opponent, was never on a squad list this app ever fetched in the first
 * place — see resolvePlayerId in sync.ts, the only caller). Returns null
 * on any failure (network, rate limit, no data) — this is always a best-
 * effort backfill, never something a sync should abort over.
 */
export async function fetchPlayerPosition({ providerId, season }: { providerId: number; season: number }): Promise<string | null> {
  try {
    const raw = await apiFootballGet<unknown[]>("/players", { id: providerId, season });
    const entry = raw[0] as { statistics?: { games?: { position?: unknown } }[] } | undefined;
    const position = entry?.statistics?.[0]?.games?.position;
    return typeof position === "string" && position.length > 0 ? position : null;
  } catch {
    return null;
  }
}

export interface ProviderTeamSearchResult {
  teamId: number;
  name: string;
  country: string | null;
}

/**
 * Looks up a team by name via API-Football's own directory — the intended
 * way to confirm MANCHESTER_UNITED_API_FOOTBALL_TEAM_ID against a live
 * response rather than trusting the hardcoded constant blindly.
 */
export async function searchTeams({ name }: { name: string }): Promise<ProviderTeamSearchResult[]> {
  const raw = await apiFootballGet<unknown[]>("/teams", { search: name });

  return raw
    .map((r) => {
      if (typeof r !== "object" || r === null) return null;
      const team = (r as Record<string, unknown>).team as Record<string, unknown> | undefined;
      if (typeof team?.id !== "number" || typeof team.name !== "string") return null;
      return {
        teamId: team.id,
        name: team.name,
        country: typeof team.country === "string" ? team.country : null,
      };
    })
    .filter((t): t is ProviderTeamSearchResult => t !== null);
}
