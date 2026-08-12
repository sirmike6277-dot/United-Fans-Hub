-- ============================================================================
-- 031_seed_fan_levels_ladder
--
-- Master Product Completion Phase C — Gamification. `fan_levels` has held
-- exactly one row (level 1 "Fan", min_points 0) since migration 007 — every
-- mechanism that turns points into a level (sync_fan_level(), the
-- FanLevelBadge/progression UI) has been correct and fully wired the whole
-- time, but with only one tier to assign, no user could ever be anything
-- but Level 1 regardless of points earned. This is a pure data seed
-- (insert-only, zero risk to existing rows/logic) — the same category of
-- change as the badge-catalog seed, not a structural migration.
--
-- Thresholds are calibrated against the only real point source that
-- currently exists (match predictions: 3/5/3 pts per correct result/score/
-- scorer — see scoring_rules) so a genuinely active predictor can reach
-- the top tier across a real season, not an arbitrary/unreachable number.
-- ============================================================================

insert into public.fan_levels (level, min_points, title) values
  (2, 25, 'Regular'),
  (3, 75, 'Supporter'),
  (4, 150, 'Loyal Fan'),
  (5, 300, 'Superfan'),
  (6, 500, 'Legend')
on conflict (level) do nothing;
