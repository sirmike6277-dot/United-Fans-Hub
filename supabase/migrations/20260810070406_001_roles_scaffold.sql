-- 001: roles + has_role() scaffold (architecture proposal §C.10, §R)

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id) on delete set null,
  primary key (profile_id, role_id)
);

create index idx_user_roles_role_id on public.user_roles(role_id);

alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

-- roles: public reference data, readable by anyone; no client writes.
create policy "Roles are publicly readable"
  on public.roles for select
  using (true);

-- user_roles: deliberately NO policies (default-deny for anon/authenticated
-- on every command). Role assignment is an operator-only action via direct
-- database access until an admin UI exists — no self-service grant path.
-- postgres/service_role bypass RLS as usual for that operator access.

-- Shared helper every admin-gated policy in later migrations will call.
create function public.has_role(role_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid()
      and r.key = role_key
  );
$$;

revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to anon, authenticated;

-- Seed the role catalog named in the architecture proposal — reference data
-- only; no user is assigned any role by this migration.
insert into public.roles (key, name, description) values
  ('super_admin', 'Super Admin', 'Full administrative access'),
  ('moderator', 'Moderator', 'Content and user moderation'),
  ('content_manager', 'Content Manager', 'Manages community content'),
  ('match_manager', 'Match Manager', 'Manages match data and lineups'),
  ('award_manager', 'Award Manager', 'Manages awards, nominations and voting');
