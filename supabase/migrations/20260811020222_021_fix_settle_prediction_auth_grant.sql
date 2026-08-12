-- 021: corrective fix for settle_prediction() (migration 020), found during
-- Phase 8 implementation itself, before this function was ever wired up
-- to any live UI:
--
--   1. `revoke all on function ... from public` did not remove a direct
--      EXECUTE grant to `anon` that this project's schema apparently
--      applies to newly-created functions independently of PUBLIC's
--      grant (confirmed live: an older function, record_moderation_action,
--      created in an earlier migration, has no such anon grant — this is
--      specific to functions created under the project's current default
--      privileges, not a mistake repeated across the codebase). Revoked
--      directly and explicitly here, rather than relying on "from public"
--      alone.
--   2. The function's ownership check, `v_prediction.profile_id <>
--      auth.uid()`, evaluates to SQL NULL (neither true nor false) when
--      auth.uid() is NULL (an unauthenticated caller) — and `IF NULL THEN`
--      in PL/pgSQL is treated as false, so the exception would silently
--      NOT fire for a caller with no session at all. Revoking anon's
--      EXECUTE (above) already makes this unreachable via the client API,
--      but an explicit guard is added anyway as defense-in-depth and to
--      genuinely satisfy "explicitly validate auth assumptions", per the
--      task's own instruction, rather than relying on an implicit
--      NULL-comparison side effect.
revoke execute on function public.settle_prediction(uuid) from anon;

create or replace function public.settle_prediction(p_prediction_id uuid)
returns public.prediction_scores
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prediction public.predictions;
  v_match public.matches;
  v_first_scorer_id uuid;
  v_result_points int := 0;
  v_score_points int := 0;
  v_scorer_points int := 0;
  v_breakdown jsonb;
  v_row public.prediction_scores;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_prediction from public.predictions where id = p_prediction_id;
  if v_prediction.id is null then
    raise exception 'Prediction not found';
  end if;

  if v_prediction.profile_id <> auth.uid() then
    raise exception 'Not authorized to settle this prediction';
  end if;

  select * into v_match from public.matches where id = v_prediction.match_id;
  if v_match.id is null or v_match.status <> 'finished'
     or v_match.home_score is null or v_match.away_score is null then
    raise exception 'Match is not finished';
  end if;

  if v_prediction.predicted_home_score is not null and v_prediction.predicted_away_score is not null then
    if sign(v_match.home_score - v_match.away_score) = sign(v_prediction.predicted_home_score - v_prediction.predicted_away_score) then
      v_result_points := 3;
    end if;
    if v_match.home_score = v_prediction.predicted_home_score and v_match.away_score = v_prediction.predicted_away_score then
      v_score_points := 5;
    end if;
  end if;

  select me.player_id into v_first_scorer_id
  from public.match_events me
  where me.match_id = v_match.id and me.event_type = 'goal'
  order by me.minute asc nulls last, me.created_at asc
  limit 1;

  if v_first_scorer_id is not null and v_prediction.predicted_first_scorer_id is not null
     and v_first_scorer_id = v_prediction.predicted_first_scorer_id then
    v_scorer_points := 3;
  end if;

  v_breakdown := jsonb_build_object(
    'correct_result', v_result_points > 0,
    'correct_result_points', v_result_points,
    'correct_score', v_score_points > 0,
    'correct_score_points', v_score_points,
    'correct_first_scorer', v_scorer_points > 0,
    'correct_first_scorer_points', v_scorer_points,
    'actual_home_score', v_match.home_score,
    'actual_away_score', v_match.away_score,
    'actual_first_scorer_id', v_first_scorer_id
  );

  insert into public.prediction_scores (prediction_id, points_awarded, breakdown, scored_by)
  values (p_prediction_id, v_result_points + v_score_points + v_scorer_points, v_breakdown, 'system')
  on conflict (prediction_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.prediction_scores where prediction_id = p_prediction_id;
    return v_row;
  end if;

  if v_result_points > 0 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id)
    values (v_prediction.profile_id, 'prediction_result_correct', v_result_points, 'prediction', p_prediction_id);
  end if;
  if v_score_points > 0 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id)
    values (v_prediction.profile_id, 'prediction_score_correct', v_score_points, 'prediction', p_prediction_id);
  end if;
  if v_scorer_points > 0 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id)
    values (v_prediction.profile_id, 'prediction_scorer_correct', v_scorer_points, 'prediction', p_prediction_id);
  end if;

  return v_row;
end;
$$;

revoke all on function public.settle_prediction(uuid) from public;
grant execute on function public.settle_prediction(uuid) to authenticated;
