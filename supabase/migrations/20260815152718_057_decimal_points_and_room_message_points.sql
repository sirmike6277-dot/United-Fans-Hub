-- 057: decimal fan points + chat room message points
--
-- Two changes, requested together:
--
-- 1. Posts and comments dropped from 1 point to 0.20 points each, and chat
--    room messages now award points at all (0.20 each) - previously there
--    was no point-awarding trigger on `messages` whatsoever, confirmed via
--    a live check of information_schema.triggers before writing this.
--    Reactions-received and prediction points are untouched - only posts,
--    comments, and chat room engagement were named in the request.
--
-- 2. point_events.points and profiles.fan_points move from integer to
--    numeric(10,2) so 0.20 actually stores as 0.20, not truncating to 0.
--    fan_levels.min_points stays integer (thresholds are still whole
--    numbers) - Postgres compares int and numeric without any cast needed.
--    PostgREST (what this app's client actually talks to, not a raw pg
--    driver) serializes numeric as a real JSON number, not a string, so no
--    client-side parsing changes are needed.
--
-- Real effect worth knowing: since the fan_levels curve (25/50/100/200...)
-- is untouched, dropping per-action points from 1 to 0.20 means levelling
-- up now takes 5x as many actions, not fewer - "decrease the points" here
-- means "decrease per-action point value", not "make levelling up easier".

alter table public.point_events alter column points type numeric(10,2);
alter table public.profiles alter column fan_points type numeric(10,2);

alter table public.point_events drop constraint point_events_event_type_check;
alter table public.point_events add constraint point_events_event_type_check
  check (event_type = any (array[
    'post_created', 'comment_created', 'room_message_created', 'reaction_received',
    'prediction_result_correct', 'prediction_score_correct', 'prediction_scorer_correct',
    'prediction_ht_correct', 'prediction_motm_correct', 'badge_awarded', 'award_won',
    'admin_adjustment'
  ]));

create or replace function public.award_post_creation_points()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_daily_count int;
begin
  if new.status <> 'published' then
    return new;
  end if;

  select count(*) into v_daily_count
  from public.point_events
  where profile_id = new.author_id
    and event_type = 'post_created'
    and created_at >= date_trunc('day', now());

  if v_daily_count < 5 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id)
    values (new.author_id, 'post_created', 0.20, 'post', new.id);
  end if;

  return new;
end;
$$;

create or replace function public.award_comment_creation_points()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_daily_count int;
begin
  if new.status <> 'published' then
    return new;
  end if;

  select count(*) into v_daily_count
  from public.point_events
  where profile_id = new.author_id
    and event_type = 'comment_created'
    and created_at >= date_trunc('day', now());

  if v_daily_count < 5 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id)
    values (new.author_id, 'comment_created', 0.20, 'comment', new.id);
  end if;

  return new;
end;
$$;

-- New: chat room engagement points. Only community_room/regional_room
-- conversations count - DMs deliberately excluded, matching the exact
-- same distinction auto_nominate_award_period() already draws for "room
-- messages" vs private messages. Same 5/day cap as posts/comments, for
-- the same anti-farming reason.
create or replace function public.award_room_message_points()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_room_kind text;
  v_daily_count int;
begin
  select kind into v_room_kind from public.conversations where id = new.conversation_id;

  if v_room_kind not in ('community_room', 'regional_room') then
    return new;
  end if;

  select count(*) into v_daily_count
  from public.point_events
  where profile_id = new.sender_id
    and event_type = 'room_message_created'
    and created_at >= date_trunc('day', now());

  if v_daily_count < 5 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id)
    values (new.sender_id, 'room_message_created', 0.20, 'message', new.id);
  end if;

  return new;
end;
$$;

create trigger on_room_message_created_award_points
  after insert on public.messages
  for each row execute function public.award_room_message_points();
