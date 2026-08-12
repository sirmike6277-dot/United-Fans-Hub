-- Real starting XI + substitutes per match, from API-Football's own
-- /fixtures/lineups endpoint — previously nothing in this schema recorded
-- who actually started a match, only match_events (goals/cards/subs),
-- which only ever mentions players who did something notable. A real
-- back-four/keeper/midfielder who played 90 quiet minutes was invisible.
--
-- club_id is resolved the same way match_events already resolves it (the
-- event's own team id, never assumed from context) — an XI entry is never
-- attributed to Manchester United just because it's this match's fixture.
--
-- `pos`/`grid` from the provider are frequently null for lower-profile
-- fixtures (confirmed live) — position on the pitch UI instead groups by
-- this player's own real players.position (Goalkeeper/Defender/Midfielder/
-- Forward), which this app already has from the squad sync. grid is kept
-- for the rare case the provider does supply it, but nothing depends on it
-- being present.
create table public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  club_id uuid not null references public.clubs(id),
  formation text,
  is_starting boolean not null,
  player_id uuid references public.players(id),
  player_name text not null,
  shirt_number smallint,
  grid text,
  created_at timestamptz not null default now()
);

create index idx_match_lineups_match on public.match_lineups(match_id);

alter table public.match_lineups enable row level security;

-- Publicly readable, same as matches/match_events — this is public fixture
-- data, not anything tied to an individual visitor.
create policy "Match lineups are publicly readable"
  on public.match_lineups for select
  using (true);

-- No authenticated-role insert/update policy, same posture as match_events:
-- only the service-role sync process writes here (see sync.ts), never a
-- visitor's own session.
