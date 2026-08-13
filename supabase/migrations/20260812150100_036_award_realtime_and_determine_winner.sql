-- ============================================================================
-- 036_award_realtime_and_determine_winner
--
-- Phase 18. Two additions:
--
-- 1. Realtime for award_periods (status transitions — e.g. nominations just
--    opened) and award_nominations (a pending→approved UPDATE is what makes
--    a nominee newly visible to the whole room under the existing SELECT
--    policy — RLS still gates delivery exactly as it gates a direct read).
--    award_votes is deliberately NOT added — same reasoning as
--    room_poll_votes (migration 033): its own RLS only ever lets a
--    subscriber see their OWN vote row, so a live feed on it could never
--    tell anyone else's vote count changed. The voting UI substitutes a
--    periodic re-fetch instead, exactly like RoomPollsPanel.
--
-- 2. determine_award_winner(p_period_id): the narrow SECURITY DEFINER
--    function that closes the loop — same "aggregate-only, re-checks its
--    own authorization" shape as room_poll_results()/settle_prediction().
--    Requires the caller to actually have award_manager/super_admin (not
--    just trust the UI), requires the period to be 'closed' (voting has
--    genuinely ended), and is a no-op (raises, not silently ignored) if a
--    winner already exists for this period — award_winners' own
--    UNIQUE(period_id) means a second real row could never be inserted
--    anyway, but a clear error is better than a confusing constraint-
--    violation message reaching the UI.
--
-- Tie-break rule (documented here since it's not obvious from the query
-- alone): highest vote_count wins; ties are broken by whichever tied
-- nomination was submitted earliest (award_nominations.created_at) — a
-- deterministic, arbitrary-free rule, not by any measure of "who's more
-- popular" that would need extra data this schema doesn't track.
-- ============================================================================

alter publication supabase_realtime add table public.award_periods;
alter publication supabase_realtime add table public.award_nominations;

create or replace function public.determine_award_winner(p_period_id uuid)
returns table(nomination_id uuid, vote_count integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_period_status text;
  v_winner_nomination_id uuid;
  v_winner_vote_count integer;
begin
  if not (public.has_role('award_manager') or public.has_role('super_admin')) then
    raise exception 'only an award manager can determine a winner';
  end if;

  select status into v_period_status from public.award_periods where id = p_period_id;
  if v_period_status is null then
    raise exception 'award period not found';
  end if;
  if v_period_status <> 'closed' then
    raise exception 'award period must be closed (voting ended) before a winner can be determined, got: %', v_period_status;
  end if;

  if exists (select 1 from public.award_winners w where w.period_id = p_period_id) then
    raise exception 'a winner has already been determined for this period';
  end if;

  select n.id, counts.votes
  into v_winner_nomination_id, v_winner_vote_count
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

  return query select v_winner_nomination_id, v_winner_vote_count;
end;
$$;

grant execute on function public.determine_award_winner(uuid) to authenticated;
