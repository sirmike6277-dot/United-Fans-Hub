-- 056: delete_award_period()
--
-- Fan of the Month/Season admin panel only ever offered a forward-only
-- lifecycle (upcoming -> ... -> announced) plus the "wrong winner" repair
-- from migration 050. There was no way to remove a period outright, so a
-- test/mistaken period (in any status) got permanently stuck: it's always
-- picked as "the" current period for its category (AwardsHub.tsx sorts by
-- period_start desc, regardless of status), which hides the "start a new
-- period" control that only renders when no period exists at all.
--
-- award_periods already grants full ALL (including DELETE) to
-- award_manager/super_admin via migration 035's "Award managers manage
-- periods" policy - award_nominations and award_votes both cascade on
-- delete via their existing FK. The one gap is award_winners, which has no
-- DELETE policy for anyone (by design - migration 050's delete_award_winner
-- SECURITY DEFINER function is the only sanctioned way to remove a winner
-- row, since it also clears the profile's crown flag if still held). This
-- function follows the exact same shape as delete_award_winner() so a
-- period with an already-announced winner can still be deleted in one
-- step, rather than requiring "delete winner" then "delete period"
-- separately.
create or replace function public.delete_award_period(p_period_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_category_key text;
  v_winner_profile_id uuid;
begin
  if not (public.has_role('award_manager') or public.has_role('super_admin')) then
    raise exception 'only an award manager can delete an award period';
  end if;

  if not exists (select 1 from public.award_periods where id = p_period_id) then
    raise exception 'award period not found';
  end if;

  -- Same crown-clearing guard as delete_award_winner(): only touch the
  -- flag if this period's winner still actually holds it (a
  -- since-superseded winner must never be touched by deleting an old
  -- period out from under it).
  select c.key, n.nominee_profile_id
  into v_category_key, v_winner_profile_id
  from public.award_winners w
  join public.award_periods p on p.id = w.period_id
  join public.award_categories c on c.id = p.category_id
  join public.award_nominations n on n.id = w.nomination_id
  where w.period_id = p_period_id;

  if v_winner_profile_id is not null then
    delete from public.award_winners where period_id = p_period_id;

    if v_category_key = 'fan_of_month' then
      update public.profiles set is_current_fan_of_month = false
      where id = v_winner_profile_id and is_current_fan_of_month;
    elsif v_category_key = 'fan_of_season' then
      update public.profiles set is_current_fan_of_season = false
      where id = v_winner_profile_id and is_current_fan_of_season;
    end if;
  end if;

  -- Nominations and votes cascade automatically (both FKs are already
  -- ON DELETE CASCADE from award_periods, migration 009).
  delete from public.award_periods where id = p_period_id;
end;
$$;
