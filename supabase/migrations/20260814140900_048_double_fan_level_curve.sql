-- 048: redesign the fan_levels progression curve — a clean doubling per
-- level instead of the original, inconsistent ratios (0->25->75->150->300->500
-- was 25x, 3x, 2x, 2x, 1.67x between consecutive levels — five picked
-- numbers, not a real curve). From here on every level costs exactly
-- double the points of the one before it, and a new 7th tier (Icon) gives
-- a genuinely dedicated fan a ceiling further out than 500 now that
-- engagement points (migration 044/047) mean points accumulate from more
-- than predictions alone.
--
--   Level 1  Fan          0
--   Level 2  Regular     25   (unchanged — still a quick first step)
--   Level 3  Supporter   50   (was 75)
--   Level 4  Loyal Fan  100   (was 150)
--   Level 5  Superfan   200   (was 300)
--   Level 6  Legend     400   (was 500)
--   Level 7  Icon       800   (new)

update public.fan_levels set min_points = 25, title = 'Regular' where level = 2;
update public.fan_levels set min_points = 50, title = 'Supporter' where level = 3;
update public.fan_levels set min_points = 100, title = 'Loyal Fan' where level = 4;
update public.fan_levels set min_points = 200, title = 'Superfan' where level = 5;
update public.fan_levels set min_points = 400, title = 'Legend' where level = 6;
insert into public.fan_levels (level, min_points, title) values (7, 800, 'Icon')
on conflict (level) do update set min_points = excluded.min_points, title = excluded.title;

-- Recompute every existing profile's cached fan_level under the new
-- thresholds. sync_fan_level() (migration 007) only fires when a
-- `profiles` UPDATE actually changes fan_points — this migration only
-- changes fan_levels itself, so without this, every profile's fan_level
-- would silently stay stale (computed under the OLD curve) until their
-- points next move for an unrelated reason.
update public.profiles p
set fan_level = (
  select fl.level from public.fan_levels fl
  where fl.min_points <= p.fan_points
  order by fl.min_points desc
  limit 1
)
where fan_level <> (
  select fl.level from public.fan_levels fl
  where fl.min_points <= p.fan_points
  order by fl.min_points desc
  limit 1
);
