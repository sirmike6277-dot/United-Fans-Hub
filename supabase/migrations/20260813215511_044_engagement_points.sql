-- 044: community engagement points ("minor boost" design)
--
-- Resolves the open decision migration 007 deliberately deferred: point_events
-- already reserves 'post_created'/'comment_created'/'reaction_received' as
-- valid event_type values, but nothing ever wrote them — predictions (3-8
-- pts/correct call, see scoring_rules) were the *only* way to earn
-- fan_points or move up the fan_levels ladder. A fan who's a great community
-- member but never predicts got zero credit for it.
--
-- This wires those three up, deliberately weighted well below prediction
-- points so predictions stay the dominant way to rank up — engagement is a
-- nudge, not a replacement (product decision, not an invented default):
--   post_created      1 pt,  capped at 5 pts/day per author
--   comment_created    1 pt,  capped at 5 pts/day per author
--   reaction_received  1 pt to the post/comment's author, capped at
--                       10 pts/day per author, and — the important part —
--                       awarded at most ONCE ever per (reactor, item) pair
--
-- The reaction cap needs its own permanent ledger (reaction_point_awards)
-- because post_reactions/comment_reactions are delete-able (UNIQUE
-- (post_id/comment_id, user_id), un-react allowed) and a naive
-- AFTER INSERT-on-point_events trigger would let two accounts mint
-- unlimited points by insert -> delete -> insert-looping a single reaction.
-- reaction_point_awards' own PK makes that first award permanent regardless
-- of what happens to the underlying reaction row afterward.
--
-- No claw-back on moderation removal (a 'removed' post/comment keeps the
-- points its creation/reactions already earned) — a deliberate scope cut,
-- not an oversight; wiring that up is a reasonable follow-up, not bundled
-- into this change.

create table public.reaction_point_awards (
  item_type text not null check (item_type in ('post', 'comment')),
  item_id uuid not null,
  reactor_profile_id uuid not null references public.profiles(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (item_type, item_id, reactor_profile_id)
);

alter table public.reaction_point_awards enable row level security;
-- Deliberately zero policies — pure internal dedupe bookkeeping, never read
-- or written by client code at all. Only the SECURITY DEFINER trigger
-- functions below ever touch it; they run as the function owner, which
-- bypasses RLS, the same posture point_events' own writers already rely on.

create function public.award_post_creation_points()
returns trigger
language plpgsql
security definer
set search_path = public
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
    values (new.author_id, 'post_created', 1, 'post', new.id);
  end if;

  return new;
end;
$$;
revoke execute on function public.award_post_creation_points() from public, anon, authenticated;

create trigger on_post_created_award_points
  after insert on public.posts
  for each row execute function public.award_post_creation_points();

create function public.award_comment_creation_points()
returns trigger
language plpgsql
security definer
set search_path = public
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
    values (new.author_id, 'comment_created', 1, 'comment', new.id);
  end if;

  return new;
end;
$$;
revoke execute on function public.award_comment_creation_points() from public, anon, authenticated;

create trigger on_comment_created_award_points
  after insert on public.comments
  for each row execute function public.award_comment_creation_points();

create function public.award_post_reaction_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_daily_count int;
begin
  select author_id into v_author_id from public.posts where id = new.post_id;

  -- Post already gone, or reacting to your own post — never self-farmable.
  if v_author_id is null or v_author_id = new.user_id then
    return new;
  end if;

  insert into public.reaction_point_awards (item_type, item_id, reactor_profile_id)
  values ('post', new.post_id, new.user_id)
  on conflict do nothing;

  -- FOUND is false when the conflict fired (this reactor already earned
  -- their one-time award for this post, even if they've since un-reacted
  -- and re-reacted) — nothing more to do.
  if not found then
    return new;
  end if;

  select count(*) into v_daily_count
  from public.point_events
  where profile_id = v_author_id
    and event_type = 'reaction_received'
    and created_at >= date_trunc('day', now());

  if v_daily_count < 10 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id, metadata)
    values (v_author_id, 'reaction_received', 1, 'post', new.post_id, jsonb_build_object('reactor_profile_id', new.user_id));
  end if;

  return new;
end;
$$;
revoke execute on function public.award_post_reaction_points() from public, anon, authenticated;

create trigger on_post_reaction_award_points
  after insert on public.post_reactions
  for each row execute function public.award_post_reaction_points();

create function public.award_comment_reaction_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_daily_count int;
begin
  select author_id into v_author_id from public.comments where id = new.comment_id;

  if v_author_id is null or v_author_id = new.user_id then
    return new;
  end if;

  insert into public.reaction_point_awards (item_type, item_id, reactor_profile_id)
  values ('comment', new.comment_id, new.user_id)
  on conflict do nothing;

  if not found then
    return new;
  end if;

  select count(*) into v_daily_count
  from public.point_events
  where profile_id = v_author_id
    and event_type = 'reaction_received'
    and created_at >= date_trunc('day', now());

  if v_daily_count < 10 then
    insert into public.point_events (profile_id, event_type, points, source_type, source_id, metadata)
    values (v_author_id, 'reaction_received', 1, 'comment', new.comment_id, jsonb_build_object('reactor_profile_id', new.user_id));
  end if;

  return new;
end;
$$;
revoke execute on function public.award_comment_reaction_points() from public, anon, authenticated;

create trigger on_comment_reaction_award_points
  after insert on public.comment_reactions
  for each row execute function public.award_comment_reaction_points();
