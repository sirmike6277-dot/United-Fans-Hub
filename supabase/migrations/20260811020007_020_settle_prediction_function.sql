-- 020: settle_prediction() (Phase 8) — the only writer for
-- prediction_scores and the prediction-related point_events rows.
--
-- Both tables were deliberately built (migrations 007/008) with no client
-- INSERT/UPDATE policy for any role: "a future settlement SECURITY
-- DEFINER function... is the only writer, matching point_events' posture."
-- This function is that writer. It is genuinely required — there is no
-- way to award points via ordinary RLS-governed writes, by the existing
-- schema's own design — and it is narrowly scoped:
--
--   * Authorization is checked INSIDE the function, not delegated to RLS:
--     the caller may only settle a prediction whose profile_id is their
--     own (auth.uid()), verified explicitly, every call.
--   * Only settles a match with status = 'finished' and real scores.
--   * Recomputes points itself from matches/match_events — a caller can
--     never supply or influence a points value directly.
--   * Idempotent: relies on prediction_scores' existing UNIQUE
--     (prediction_id) constraint via ON CONFLICT DO NOTHING; a repeat
--     call for an already-settled prediction returns the existing row
--     and inserts no additional point_events.
--
-- V1 scores exactly three approved dimensions (see migration 019):
-- correct_result (3), correct_score (5, additive), correct_first_scorer
-- (3). Half-time score and Man of the Match are explicitly NOT settled —
-- no reliable actual data exists for either yet.
create function public.settle_prediction(p_prediction_id uuid)
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
    -- Already settled by a prior call — return the existing row. Do NOT
    -- insert point_events again; whichever call actually won the insert
    -- above already did so.
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

comment on function public.settle_prediction is
  'Only path that can write to prediction_scores and prediction-related point_events. Verifies the caller owns the prediction, that its match is genuinely finished, and recomputes points from real match/match_events data — never trusts a client-supplied score. Idempotent via prediction_scores'' existing UNIQUE(prediction_id) constraint.';

revoke all on function public.settle_prediction(uuid) from public;
grant execute on function public.settle_prediction(uuid) to authenticated;
