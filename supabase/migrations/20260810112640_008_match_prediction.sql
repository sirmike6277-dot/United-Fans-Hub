-- 008: match/prediction (architecture proposal §C.7, §P) — flattened
-- predictions model as instructed. Provider-agnostic via external_ref.
-- Also resolves the deferred profiles.favourite_player_id FK from 003, now
-- that players exists.

create table public.players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id),
  full_name text not null,
  position text,
  shirt_number int,
  external_ref text,
  photo_asset_ref text,
  created_at timestamptz not null default now()
);

create index idx_players_club on public.players(club_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id),
  opponent_name text not null,
  competition text,
  kickoff_at timestamptz not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','postponed','cancelled')),
  home_score int,
  away_score int,
  external_ref text unique,
  created_at timestamptz not null default now()
);

create index idx_matches_club_kickoff on public.matches(club_id, kickoff_at);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  minute int,
  event_type text not null check (event_type in ('goal','yellow_card','red_card','substitution','var')),
  player_id uuid references public.players(id),
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_match_events_match on public.match_events(match_id);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id),
  predicted_home_score int,
  predicted_away_score int,
  predicted_ht_home int,
  predicted_ht_away int,
  predicted_first_scorer_id uuid references public.players(id),
  predicted_motm_id uuid references public.players(id),
  submitted_at timestamptz not null default now(),
  locked_at timestamptz,
  unique (profile_id, match_id)
);

create index idx_predictions_match on public.predictions(match_id);

create table public.prediction_scores (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null unique references public.predictions(id) on delete cascade,
  points_awarded int not null,
  breakdown jsonb,
  scored_at timestamptz not null default now(),
  scored_by text not null default 'system'
);

create table public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id),
  rule_key text not null check (rule_key in ('correct_result','correct_score','correct_first_scorer','correct_ht_score','correct_motm')),
  points_value int not null,
  active_from timestamptz not null default now(),
  active_to timestamptz
);

create index idx_scoring_rules_key_active on public.scoring_rules(rule_key, active_from);

-- Resolve the deferral noted in migration 003.
alter table public.profiles
  add column favourite_player_id uuid references public.players(id);

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_scores enable row level security;
alter table public.scoring_rules enable row level security;

-- Public reference/display data; match_manager maintains it.
create policy "Players are publicly readable"
  on public.players for select using (true);
create policy "Match managers manage players"
  on public.players for all
  using (public.has_role('match_manager')) with check (public.has_role('match_manager'));

create policy "Matches are publicly readable"
  on public.matches for select using (true);
create policy "Match managers manage matches"
  on public.matches for all
  using (public.has_role('match_manager')) with check (public.has_role('match_manager'));

create policy "Match events are publicly readable"
  on public.match_events for select using (true);
create policy "Match managers manage match events"
  on public.match_events for all
  using (public.has_role('match_manager')) with check (public.has_role('match_manager'));

-- Predictions: strictly owner-private (competitive-integrity default — not
-- explicitly specified either way by the proposal; documented decision).
-- Lock enforcement compares directly against matches.kickoff_at rather than
-- depending on a cron-populated locked_at, since pg_cron isn't installed
-- in this phase.
create policy "Users can view their own predictions"
  on public.predictions for select
  using (profile_id = (select auth.uid()));

create policy "Users can submit predictions before kickoff"
  on public.predictions for insert
  with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and now() < m.kickoff_at)
  );

create policy "Users can edit their own predictions before kickoff"
  on public.predictions for update
  using (
    profile_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and now() < m.kickoff_at)
  );

-- prediction_scores: system-only write (settlement logic, not built yet);
-- owner can read their own score breakdown; super_admin can audit all.
create policy "Users can view their own prediction scores"
  on public.prediction_scores for select
  using (exists (
    select 1 from public.predictions p where p.id = prediction_id and p.profile_id = (select auth.uid())
  ));
create policy "Super admins can view all prediction scores"
  on public.prediction_scores for select
  using (public.has_role('super_admin'));
-- No insert/update/delete policy for any client role — a future settlement
-- SECURITY DEFINER function (built when match-day settlement is
-- implemented) is the only writer, matching point_events' posture.

-- scoring_rules: public read (so the app can display "how points work");
-- write restricted to super_admin, same posture as the rest of the
-- points/scoring system (fan_levels, badges) for consistency.
create policy "Scoring rules are publicly readable"
  on public.scoring_rules for select using (true);
create policy "Super admins manage scoring rules"
  on public.scoring_rules for all
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
