-- Supabase Auth signs in by email only. To support logging in with a
-- username (the UI promises "Email or Username"), this resolves a username
-- to its email so the client can retry signInWithPassword with it. Read-only
-- and narrow — returns null for no match rather than raising, and reveals
-- nothing beyond "this username exists" (the same fact profiles.select
-- already exposes publicly), so it's deliberately granted EXECUTE.
create function public.email_for_username(lookup_username text)
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select email::text from auth.users
  where id = (select id from public.profiles where username = lookup_username);
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;
