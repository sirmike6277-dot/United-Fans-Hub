-- 049: "current champion" crown flags for Fan of the Month / Fan of the
-- Season winners.
--
-- award_winners is already a real, permanent historical record (who won
-- which period) — that alone covers "show it on their profile" as a
-- history list, no new column needed for that. What's missing is a *cheap*
-- answer to "is this profile the CURRENT reigning champion right now?",
-- asked on every avatar render across the whole app (posts, comments,
-- rooms, messages, leaderboard) — joining award_periods/award_winners/
-- award_nominations on every single avatar would be real, avoidable
-- overhead. Two denormalized booleans on `profiles`, kept in sync by
-- determine_award_winner() itself (the one place a winner is ever
-- recorded), make that check as cheap as reading a column already fetched
-- alongside fan_level everywhere.
--
-- Exactly one profile holds each crown at a time — awarding a new one
-- clears whoever held it before, same "current champion" semantics as a
-- real title, not a permanent collection (see award_winners for the
-- permanent history instead).

alter table public.profiles add column is_current_fan_of_month boolean not null default false;
alter table public.profiles add column is_current_fan_of_season boolean not null default false;

-- Same column-level lockdown as fan_points/fan_level (migration 012) — a
-- client can SELECT these (the whole point is showing the crown to
-- everyone) but only a trusted function (this one) can ever set them.
revoke insert (is_current_fan_of_month, is_current_fan_of_season) on public.profiles from authenticated, anon;
revoke update (is_current_fan_of_month, is_current_fan_of_season) on public.profiles from authenticated, anon;

comment on column public.profiles.is_current_fan_of_month is
  'True for exactly the current Fan of the Month, if one has been announced — never client-writable, set only by determine_award_winner().';
comment on column public.profiles.is_current_fan_of_season is
  'True for exactly the current Fan of the Season, if one has been announced — never client-writable, set only by determine_award_winner().';

create or replace function public.determine_award_winner(p_period_id uuid)
returns table(nomination_id uuid, vote_count integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_period_status text;
  v_category_key text;
  v_winner_nomination_id uuid;
  v_winner_vote_count integer;
  v_winner_profile_id uuid;
begin
  if not (public.has_role('award_manager') or public.has_role('super_admin')) then
    raise exception 'only an award manager can determine a winner';
  end if;

  select p.status, c.key into v_period_status, v_category_key
  from public.award_periods p
  join public.award_categories c on c.id = p.category_id
  where p.id = p_period_id;

  if v_period_status is null then
    raise exception 'award period not found';
  end if;
  if v_period_status <> 'closed' then
    raise exception 'award period must be closed (voting ended) before a winner can be determined, got: %', v_period_status;
  end if;

  if exists (select 1 from public.award_winners w where w.period_id = p_period_id) then
    raise exception 'a winner has already been determined for this period';
  end if;

  select n.id, counts.votes, n.nominee_profile_id
  into v_winner_nomination_id, v_winner_vote_count, v_winner_profile_id
  from public.award_nominations n
  join (
    select v.nomination_id, count(*)::int as votes
    from public.award_votes v
    where v.period_id = p_period_id
    group by v.nomination_id
  ) counts on counts.nomination_id = n.id
  where n.period_id = p_period_id and n.status = 'approved'
  order by counts.votes desc, n.created_at asc
  limit 1;

  if v_winner_nomination_id is null then
    raise exception 'no votes were cast for this period — cannot determine a winner';
  end if;

  insert into public.award_winners (period_id, nomination_id, vote_count)
  values (p_period_id, v_winner_nomination_id, v_winner_vote_count);

  update public.award_periods set status = 'announced' where id = p_period_id;

  -- Pass the crown: clear whoever held it before, then set it on the new
  -- winner — exactly one current holder per category, same as any other
  -- "reigning champion" title. Only two real category keys exist
  -- (fan_of_month/fan_of_season — see award_categories); anything else is
  -- a no-op rather than an error, so a future third category doesn't break
  -- this function, it just doesn't get a crown column until one is added.
  if v_category_key = 'fan_of_month' then
    update public.profiles set is_current_fan_of_month = false where is_current_fan_of_month;
    update public.profiles set is_current_fan_of_month = true where id = v_winner_profile_id;
  elsif v_category_key = 'fan_of_season' then
    update public.profiles set is_current_fan_of_season = false where is_current_fan_of_season;
    update public.profiles set is_current_fan_of_season = true where id = v_winner_profile_id;
  end if;

  return query select v_winner_nomination_id, v_winner_vote_count;
end;
$function$;

-- Backfill: crown whoever already holds the most recent announced win in
-- each category — determine_award_winner() only maintains this flag from
-- here forward, so without this, an already-real winner (announced before
-- this migration ran) would incorrectly show no crown until someone new
-- wins next period.
with latest_per_category as (
  select distinct on (c.key)
    c.key as category_key,
    n.nominee_profile_id
  from public.award_winners w
  join public.award_periods p on p.id = w.period_id
  join public.award_categories c on c.id = p.category_id
  join public.award_nominations n on n.id = w.nomination_id
  order by c.key, w.announced_at desc
)
update public.profiles pr
set is_current_fan_of_month = true
from latest_per_category l
where l.category_key = 'fan_of_month' and pr.id = l.nominee_profile_id;

with latest_per_category as (
  select distinct on (c.key)
    c.key as category_key,
    n.nominee_profile_id
  from public.award_winners w
  join public.award_periods p on p.id = w.period_id
  join public.award_categories c on c.id = p.category_id
  join public.award_nominations n on n.id = w.nomination_id
  order by c.key, w.announced_at desc
)
update public.profiles pr
set is_current_fan_of_season = true
from latest_per_category l
where l.category_key = 'fan_of_season' and pr.id = l.nominee_profile_id;
