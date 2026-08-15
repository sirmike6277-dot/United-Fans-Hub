-- 058: fan level curve - double the SPAN between levels, not the
-- cumulative total.
--
-- The previous curve (0/25/50/100/200/400/800, from migration 048) had
-- each cumulative threshold double, but that means the span from Regular
-- to Supporter is 50-25=25 - the same as the span from Fan to Regular
-- (25-0=25), not double it. Confirmed as the actual source of "it shows
-- 25 points to get to Supporter instead of 50" - not a display bug, the
-- curve itself didn't do what was asked.
--
-- This migration instead doubles the SPAN starting at 25: 25, 50, 100,
-- 200, 400, 800 - giving cumulative thresholds 0/25/75/175/375/775/1575.
update public.fan_levels set min_points = 0 where level = 1;
update public.fan_levels set min_points = 25 where level = 2;
update public.fan_levels set min_points = 75 where level = 3;
update public.fan_levels set min_points = 175 where level = 4;
update public.fan_levels set min_points = 375 where level = 5;
update public.fan_levels set min_points = 775 where level = 6;
update public.fan_levels set min_points = 1575 where level = 7;

-- One-time backfill: fan_level is only recomputed by sync_fan_level()
-- when fan_points changes, so existing profiles would otherwise keep a
-- stale level against the new thresholds until their points next move.
-- No real profile actually changes level under the new curve right now
-- (highest real balance is 29.20, still level 2 either way) - this is
-- for correctness going forward, not a live behavior change today.
update public.profiles p
set fan_level = (
  select level from public.fan_levels
  where min_points <= p.fan_points
  order by min_points desc
  limit 1
)
where fan_level is distinct from (
  select level from public.fan_levels
  where min_points <= p.fan_points
  order by min_points desc
  limit 1
);
