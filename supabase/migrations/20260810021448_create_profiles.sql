-- profiles: one row per auth.users, the public fan identity.
-- Kept as fixed typed columns (not an EAV table) since the field set is
-- fixed and known — see docs/architecture for the reasoning.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text,
  location text,
  country text,
  favourite_player text,
  favourite_era text,
  fan_since_year smallint,
  favourite_shirt text,
  favourite_memory text,
  fan_level integer not null default 1,
  fan_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (char_length(username) between 3 and 24),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

alter table public.profiles enable row level security;

-- Profiles are the public fan identity — readable by anyone, including
-- signed-out visitors (e.g. viewing a public profile page).
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-provision a profile row the moment a user signs up, from the
-- username/full name passed as auth.signUp() metadata — the standard
-- Supabase pattern, so a profile can never be missing due to a dropped
-- client-side request after signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'fan_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at accurate on every change.
create function public.handle_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_profile_updated_at();
