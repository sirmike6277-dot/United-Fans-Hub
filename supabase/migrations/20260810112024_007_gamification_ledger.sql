-- 007: gamification ledger (architecture proposal §C.6, §K)
-- point_events is the sole source of truth. profiles.fan_points/fan_level
-- are cached, trigger-synced, never directly client-writable.
-- NOTE: no automatic point-awarding trigger for post_created/comment_created/
-- reaction_received is added here — the proposal reserves those event_type
-- values but specifies no point VALUES for them (unlike prediction scoring,
-- which gets explicit scoring_rules in migration 008). Wiring an award
-- trigger with an invented point value would be inventing a business rule
-- not supported by the proposal or product brief. Flagged as an open
-- product decision for later, not implemented now.

create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'post_created','comment_created','reaction_received',
    'prediction_result_correct','prediction_score_correct','prediction_scorer_correct',
    'prediction_ht_correct','prediction_motm_correct',
    'badge_awarded','award_won','admin_adjustment'
  )),
  points int not null,
  source_type text,
  source_id uuid,
  created_by uuid references public.profiles(id),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_point_events_profile_created on public.point_events(profile_id, created_at);

alter table public.point_events enable row level security;

create policy "Users can view their own point history"
  on public.point_events for select
  using (profile_id = (select auth.uid()));

create policy "Super admins can view all point events"
  on public.point_events for select
  using (public.has_role('super_admin'));

create policy "Super admins can record point events"
  on public.point_events for insert
  with check (public.has_role('super_admin'));

-- No update/delete policy for anyone — the ledger is append-only; the only
-- correction mechanism is a new admin_adjustment row, never an edit.
-- No insert policy for ordinary authenticated/anon users at all — future
-- settlement logic (e.g. prediction scoring) writes via its own SECURITY
-- DEFINER function, never a direct client insert.

create table public.fan_levels (
  level int primary key,
  min_points int not null unique,
  title text not null
);

alter table public.fan_levels enable row level security;

create policy "Fan levels are publicly readable"
  on public.fan_levels for select
  using (true);

create policy "Super admins manage fan levels"
  on public.fan_levels for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

-- Seed only the baseline tier so the existing profiles.fan_level default (1)
-- stays valid once the FK below is added. Further tiers are an admin/product
-- decision, not fabricated here.
insert into public.fan_levels (level, min_points, title) values (1, 0, 'Fan');

alter table public.profiles
  add constraint profiles_fan_level_fkey foreign key (fan_level) references public.fan_levels(level);

create function public.sync_fan_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set fan_points = fan_points + new.points
  where id = new.profile_id;
  return new;
end;
$$;
revoke execute on function public.sync_fan_points() from public, anon, authenticated;

create trigger on_point_event_sync_fan_points
  after insert on public.point_events
  for each row execute function public.sync_fan_points();

create function public.sync_fan_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fan_points is distinct from old.fan_points then
    select level into new.fan_level
    from public.fan_levels
    where min_points <= new.fan_points
    order by min_points desc
    limit 1;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_fan_level() from public, anon, authenticated;

create trigger on_profile_points_changed
  before update on public.profiles
  for each row execute function public.sync_fan_level();

create table public.engagement_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  score numeric not null,
  computed_at timestamptz not null default now(),
  unique (profile_id, period_start, period_end)
);

create index idx_engagement_snapshots_period on public.engagement_snapshots(period_start, period_end, score desc);

alter table public.engagement_snapshots enable row level security;

create policy "Engagement snapshots are publicly readable"
  on public.engagement_snapshots for select
  using (true);

-- No client writes — populated only by a future scheduled job (needs
-- pg_cron, deliberately not installed in this phase per instruction).

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  icon_asset_ref text,
  criteria jsonb,
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "Badges are publicly readable"
  on public.badges for select
  using (true);

create policy "Super admins manage badges"
  on public.badges for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles(id),
  source_type text,
  source_id uuid,
  unique (profile_id, badge_id)
);

create index idx_user_badges_profile on public.user_badges(profile_id);

alter table public.user_badges enable row level security;

create policy "User badges are publicly readable"
  on public.user_badges for select
  using (true);

create policy "Super admins award badges"
  on public.user_badges for insert
  with check (public.has_role('super_admin'));

-- No update/delete — badge awards are an append-only historical record.
