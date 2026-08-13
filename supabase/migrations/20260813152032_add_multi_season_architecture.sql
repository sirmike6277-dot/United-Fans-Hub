-- Phase 2A: Multi-Season Architecture. `matches` previously had no concept
-- of "season" or a stable numeric competition id at all — every fixture
-- synced into one flat, season-agnostic table, and the single global
-- "fixtures" sync_status key (see add_sync_status) meant syncing any one
-- season would block syncing any other. Neither problem was visible while
-- this app only ever synced one season (2024/25, via the
-- API_FOOTBALL_SEASON=2024 dev-only override) — both become real the
-- moment more than one season's fixtures need to coexist.

alter table public.matches
  add column season int,
  add column competition_external_ref text;

comment on column public.matches.season is
  'The season this fixture belongs to, as its start year (e.g. 2026 for the 2026/27 season) — see src/lib/matches/season.ts for the shared start-year/label conversion used everywhere else in the app. Populated going forward directly from the provider''s own league.season field at sync time (see parseFixture in provider.ts) — the provider''s own assignment, not recomputed from kickoff_at. Backfilled below for every pre-existing row using the same July-cutoff rule as a fallback, since those rows were synced before this column existed and league.season was never captured for them.';

comment on column public.matches.competition_external_ref is
  'API-Football''s own numeric league id (e.g. "39" for Premier League, "3" for UEFA Europa League) — the real, provider-stable identifier for "which competition," never inferred by matching the free-text `competition` name (which drifts — e.g. this app has both "UEFA Europa League" and "Premier League - Summer Series" as real observed values). `competition` is kept as-is as the display label; this is additive. Null for every row synced before this migration — that data was never captured, and is deliberately NOT backfilled by guessing from the competition name column, which is exactly the kind of unreliable matching this column exists to replace. Populated going forward for any newly-synced fixture.';

-- Backfill season for existing rows from their own real kickoff_at — pure
-- derived data already in this table, zero new provider calls. Mirrors
-- src/lib/matches/season.ts's seasonForDate() exactly (July cutoff).
update public.matches
set season = case
  when extract(month from kickoff_at) >= 7 then extract(year from kickoff_at)::int
  else extract(year from kickoff_at)::int - 1
end
where season is null;

alter table public.matches alter column season set not null;

create index idx_matches_club_season on public.matches(club_id, season);

-- The old global "fixtures" sync_status key is superseded by the new
-- season-scoped `fixtures:<season>` keys (see sync.ts's maybeSyncFixtures)
-- — harmless to leave, but removing it now avoids a permanently-stale,
-- never-read row sitting around from here on.
delete from public.sync_status where key = 'fixtures';


-- football_capabilities: Phase 2A's coverage-aware synchronization system
-- (sections 8-10 of the phase spec) — records what this app has *actually
-- verified* API-Football provides, per team + season + competition +
-- feature, so a capability is only ever checked against the live provider
-- once, not on every page load. A row here is written ONLY after a real
-- attempt (see sync.ts's recordCapability, called from the future
-- feature-specific sync functions, not from this migration) — this table
-- starts seeded only with facts already directly confirmed elsewhere this
-- session (see the two inserts below), never with a speculative guess.
create table public.football_capabilities (
  id uuid primary key default gen_random_uuid(),
  team_id int not null,
  season int not null,
  -- Null when a feature isn't competition-scoped (e.g. "fixtures" covers
  -- every competition a team plays in one call) — only set for a feature
  -- that's genuinely checked per-competition.
  competition_external_ref text,
  feature text not null,
  status text not null check (status in (
    'available', 'unavailable', 'subscription_limited', 'not_supported',
    'not_yet_available', 'temporarily_unavailable', 'unknown'
  )),
  checked_at timestamptz not null default now(),
  reason text,
  unique (team_id, season, competition_external_ref, feature)
);

alter table public.football_capabilities enable row level security;

-- Public read — this is metadata about data availability, not sensitive,
-- same posture as matches/match_events (publicly readable, service-role
-- only for writes since there's no client role write policy at all).
create policy "Football capabilities are publicly readable"
  on public.football_capabilities for select
  using (true);

-- Seed only what's already real, directly-confirmed fact from this
-- session's own testing — never a guess. Both facts below were confirmed
-- via literal API-Football responses, not assumed from documentation.
insert into public.football_capabilities (team_id, season, competition_external_ref, feature, status, reason)
values
  -- Confirmed extensively this session: real fixtures/events/lineups
  -- synced and independently verified (see the opponent-formation-
  -- fallback-architecture and match-centre memories) for season 2024.
  (33, 2024, null, 'fixtures', 'available', 'Confirmed via real successful syncs and independent fact-checking against external sources this session (Phase 1 and earlier).'),
  (33, 2024, null, 'events', 'available', 'Confirmed via real successful syncs this session — goals/cards/subs/VAR synced and rendered correctly for multiple real fixtures.'),
  (33, 2024, null, 'lineups', 'available', 'Confirmed via real successful syncs this session — starting XI/subs/formation/grid synced and rendered correctly for multiple real fixtures.'),
  -- Confirmed blocked, structurally — re-tested live multiple times across
  -- this session (most recently today) with an identical result every
  -- time, for both season 2025 and season 2026.
  (33, 2025, null, 'fixtures', 'subscription_limited', 'Live API-Football response: {"plan":"Free plans do not have access to this season, try from 2022 to 2024."} — confirmed via direct GET /fixtures?team=33&season=2025.'),
  (33, 2026, null, 'fixtures', 'subscription_limited', 'Live API-Football response: {"plan":"Free plans do not have access to this season, try from 2022 to 2024."} — confirmed via direct GET /fixtures?team=33&season=2026.')
on conflict (team_id, season, competition_external_ref, feature) do nothing;
