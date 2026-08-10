-- ============================================================================
-- 012_secure_profiles_gamification_columns
--
-- Fixes CRITICAL finding #1 from the pre-UI audit: any authenticated user
-- could directly UPDATE their own profiles.fan_points/fan_level, bypassing
-- the entire event-sourced point_events ledger.
--
-- Root cause: RLS is row-level, not column-level. The existing "Users can
-- update their own profile" policy (using (auth.uid() = id), no with_check)
-- correctly restricts WHICH ROW a user may touch, but has no way to restrict
-- WHICH COLUMNS within that row — and Supabase's default table-wide grants
-- give `authenticated` UPDATE on every column, including fan_points/fan_level.
--
-- Fix: this is fundamentally a column-granularity problem, not a row-
-- granularity one, so the correct database-level tool is a column-level
-- privilege REVOKE, not an RLS policy change. This leaves the existing
-- profile policy completely untouched — display_name/bio/location/etc.
-- remain freely editable by their owner exactly as before.
--
-- Why this doesn't break the trusted sync path: sync_fan_points() and
-- sync_fan_level() are SECURITY DEFINER functions owned by `postgres`, which
-- also owns the `profiles` table. Table/function owners are not subject to
-- their own GRANT/REVOKE bookkeeping — an owner always has full privileges
-- on its own objects regardless of what's revoked from other roles. So the
-- triggers' internal `UPDATE profiles SET fan_points = ...` continues to
-- work exactly as before; only direct client-issued updates (running as
-- `authenticated`/`anon`) are blocked, and they're blocked at the privilege-
-- check stage, before RLS is even evaluated.
--
-- Also covers INSERT on these two columns: "Users can insert their own
-- profile" would otherwise let a client set an arbitrary starting
-- fan_points/fan_level on their own row-creation INSERT. Closed for the same
-- reason, in the same pass.
-- ============================================================================

revoke insert (fan_points, fan_level) on public.profiles from authenticated, anon;
revoke update (fan_points, fan_level) on public.profiles from authenticated, anon;

comment on column public.profiles.fan_points is
  'Cached, read-optimized total — never client-writable (see 012_secure_profiles_gamification_columns). Source of truth is SUM(points) FROM point_events; kept in sync by sync_fan_points().';
comment on column public.profiles.fan_level is
  'Cached, derived value — never client-writable (see 012_secure_profiles_gamification_columns). Recomputed from fan_levels by sync_fan_level() whenever fan_points changes.';