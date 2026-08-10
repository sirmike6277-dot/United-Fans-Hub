-- 003: social_links + additive profile columns (architecture proposal §C.1)
-- favourite_player_id deferred to 008 (its FK target `players` doesn't
-- exist yet) — see migration notes / implementation doc for why.

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('instagram','x_twitter','tiktok','youtube','facebook','other')),
  handle_or_url text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, platform)
);

create index idx_social_links_profile_id on public.social_links(profile_id);

alter table public.social_links enable row level security;

-- Same visibility model as profiles: public read, owner-only write.
create policy "Social links are publicly readable"
  on public.social_links for select
  using (true);

create policy "Users can insert their own social links"
  on public.social_links for insert
  with check ((select auth.uid()) = profile_id);

create policy "Users can update their own social links"
  on public.social_links for update
  using ((select auth.uid()) = profile_id);

create policy "Users can delete their own social links"
  on public.social_links for delete
  using ((select auth.uid()) = profile_id);

-- Additive, nullable fan-identity columns — same fixed-field reasoning as
-- the existing favourite_player/favourite_era/favourite_shirt columns.
alter table public.profiles
  add column matchday_routine text,
  add column fan_style text,
  add column favourite_chant text;
