-- ============================================================================
-- 037_award_vote_counts_and_seed_categories
--
-- Phase 18 — a genuine gap found while building the voting UI: award_votes'
-- own RLS ("Voters can see their own votes; managers see all") means an
-- ordinary member has no way to see current tallies while voting is still
-- open — exactly the same shape as room_poll_votes before room_poll_results()
-- was added (migration 027). award_vote_counts() is that same pattern:
-- aggregate-only, never reveals who voted for what, callable by any
-- authenticated member (not just a participant of something — award
-- periods/nominations are already fully public-read once approved, so
-- there is no narrower boundary to re-check here the way room-membership
-- was for polls).
--
-- Also seeds the two award categories this phase actually needs — pure
-- data, zero rows affected elsewhere, same "insert-only, zero risk"
-- character as migration 031's fan_levels ladder seed.
-- ============================================================================

create or replace function public.award_vote_counts(p_period_id uuid)
returns table(nomination_id uuid, votes bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select n.id, count(v.voter_profile_id)
  from public.award_nominations n
  left join public.award_votes v on v.nomination_id = n.id
  where n.period_id = p_period_id and n.status = 'approved'
  group by n.id;
$$;

grant execute on function public.award_vote_counts(uuid) to authenticated;

insert into public.award_categories (key, name, description) values
  ('fan_of_month', 'Fan of the Month', 'Recognising the fan who embodied the community most this month.'),
  ('fan_of_season', 'Fan of the Season', 'Recognising the fan who embodied the community most this season.')
on conflict (key) do nothing;
