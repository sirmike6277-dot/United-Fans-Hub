-- 002: clubs seam (architecture proposal §C.2) — single active club now,
-- schema ready for more later. No multi-club UI/logic implemented.

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  emblem_asset_ref text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clubs_is_active on public.clubs(is_active);

alter table public.clubs enable row level security;

-- Public reference data — club name/emblem are display information.
create policy "Clubs are publicly readable"
  on public.clubs for select
  using (true);

-- Club management is a rare, foundational operation — gated to super_admin
-- only (the proposal doesn't name a specific role for this; super_admin is
-- the narrowest defensible choice, documented as an implementation decision).
create policy "Super admins can manage clubs"
  on public.clubs for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

create trigger on_club_updated
  before update on public.clubs
  for each row execute function public.handle_profile_updated_at();

-- Seed the single Manchester United row — the seam's entire purpose per the
-- architecture proposal ("One row for Manchester United"), using the same
-- real, licensed emblem asset already in the codebase.
insert into public.clubs (name, slug, emblem_asset_ref, is_active)
values ('Manchester United', 'manchester-united', '/images/branding/manchester-united-emblem.webp', true);
