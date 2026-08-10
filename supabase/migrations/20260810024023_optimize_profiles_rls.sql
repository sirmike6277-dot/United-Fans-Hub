-- Wrap auth.uid() as (select auth.uid()) so Postgres evaluates it once per
-- query instead of once per row — same policy logic, better query plan.
drop policy "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);
