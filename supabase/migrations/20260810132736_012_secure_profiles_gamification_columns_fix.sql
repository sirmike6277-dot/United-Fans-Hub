-- ============================================================================
-- Corrective: the previous migration's column-specific REVOKE had no effect,
-- because authenticated/anon hold their INSERT/UPDATE privilege on profiles
-- at the TABLE level (covering all columns implicitly), not at column level.
-- A column-specific REVOKE cannot narrow a broader table-level GRANT — verified
-- via information_schema.column_privileges still showing fan_points/fan_level
-- as grantable after the first attempt.
--
-- Fix: revoke the table-level INSERT/UPDATE grant entirely, then re-grant at
-- column granularity, naming every column except fan_points/fan_level. This
-- preserves every existing capability (including whatever was already true
-- for id/created_at, unchanged) and only removes the two target columns.
-- ============================================================================

revoke insert, update on public.profiles from authenticated, anon;

grant insert (
  id, username, display_name, avatar_url, cover_url, bio, location, country,
  favourite_player, favourite_era, fan_since_year, favourite_shirt, favourite_memory,
  created_at, updated_at, matchday_routine, fan_style, favourite_chant, favourite_player_id
) on public.profiles to authenticated, anon;

grant update (
  id, username, display_name, avatar_url, cover_url, bio, location, country,
  favourite_player, favourite_era, fan_since_year, favourite_shirt, favourite_memory,
  created_at, updated_at, matchday_routine, fan_style, favourite_chant, favourite_player_id
) on public.profiles to authenticated, anon;