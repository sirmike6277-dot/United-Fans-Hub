-- 019: seed the approved V1 prediction scoring rules (Phase 8). migration
-- 008 defined the five scoring categories (rule_key CHECK) but explicitly
-- never assigned point values — "an open product decision for later, not
-- implemented now" (migration 007's comment). Point values are now
-- approved for exactly three of the five categories:
--   correct_result         = 3 points
--   correct_score (exact)  = 5 additional points (on top of correct_result)
--   correct_first_scorer   = 3 points
-- correct_ht_score and correct_motm remain unseeded/inactive — neither has
-- a reliable "actual" data source yet (no half-time score is captured by
-- Match Centre; no authoritative Man of the Match source exists), so no
-- migration seeds a points_value for either.
--
-- scoring_rules had no unique constraint beyond its primary key, so a
-- naive re-run of this seed could create duplicate rows for the same
-- (club, rule) pair. Adding one here — a small, directly-justified
-- addition, not a broader schema change — makes both this migration and
-- any future scoring-rule management idempotent/safely constrained.
alter table public.scoring_rules
  add constraint scoring_rules_club_id_rule_key_key unique (club_id, rule_key);

insert into public.scoring_rules (club_id, rule_key, points_value)
select id, 'correct_result', 3 from public.clubs where slug = 'manchester-united'
union all
select id, 'correct_score', 5 from public.clubs where slug = 'manchester-united'
union all
select id, 'correct_first_scorer', 3 from public.clubs where slug = 'manchester-united'
on conflict (club_id, rule_key) do nothing;
