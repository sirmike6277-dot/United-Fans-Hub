-- 047: backfill engagement points for content that predates migration 044
--
-- 044 wired up post_created/comment_created/reaction_received points via
-- AFTER INSERT triggers — real for every post/comment/reaction from that
-- moment forward, but silent on everything created before it (this app's
-- very first posts/comments/reactions, including this account's own).
-- "Your points aren't moving despite being active" for an early user was a
-- real, reported symptom of that gap, not a misunderstanding — this
-- migration is the one-time catch-up, applying the *exact* same rules the
-- trigger already applies going forward (same daily caps, same permanent
-- per-reactor-per-item dedup via reaction_point_awards, same self-reaction
-- exclusion) rather than a separate, looser backfill rule:
--
--   post_created       1 pt,  capped at 5/day/author (chronological order)
--   comment_created    1 pt,  capped at 5/day/author (chronological order)
--   reaction_received  1 pt to the author, capped at 10/day/author, at most
--                       once ever per (reactor, item) pair
--
-- Idempotent by construction: every insert here is NOT EXISTS/ON CONFLICT
-- guarded against point_events/reaction_point_awards rows the *live*
-- triggers may have already written for the same content (e.g. a post
-- created between 044 shipping and this backfill running) — re-running
-- this migration, or running it after 044 has been live for a while,
-- awards nothing a second time.
--
-- created_at on every backfilled point_events row is the real historical
-- timestamp of the post/comment/reaction, not now() — so these don't
-- masquerade as today's activity, and so today's live daily caps aren't
-- thrown off by a wave of "backfilled just now" rows.

-- Posts
with ranked_posts as (
  select
    p.id,
    p.author_id,
    p.created_at,
    row_number() over (partition by p.author_id, date_trunc('day', p.created_at) order by p.created_at) as daily_rank
  from public.posts p
  where p.status = 'published'
    and not exists (
      select 1 from public.point_events pe
      where pe.event_type = 'post_created' and pe.source_type = 'post' and pe.source_id = p.id
    )
)
insert into public.point_events (profile_id, event_type, points, source_type, source_id, created_at)
select author_id, 'post_created', 1, 'post', id, created_at
from ranked_posts
where daily_rank <= 5;

-- Comments
with ranked_comments as (
  select
    c.id,
    c.author_id,
    c.created_at,
    row_number() over (partition by c.author_id, date_trunc('day', c.created_at) order by c.created_at) as daily_rank
  from public.comments c
  where c.status = 'published'
    and not exists (
      select 1 from public.point_events pe
      where pe.event_type = 'comment_created' and pe.source_type = 'comment' and pe.source_id = c.id
    )
)
insert into public.point_events (profile_id, event_type, points, source_type, source_id, created_at)
select author_id, 'comment_created', 1, 'comment', id, created_at
from ranked_comments
where daily_rank <= 5;

-- Post reactions — first, permanently record every eligible (reactor, post)
-- pair in reaction_point_awards (mirrors the live trigger's own
-- insert-before-cap-check order), then award points for only the first 10
-- per author per day, in chronological order.
with eligible_post_reactions as (
  select pr.post_id, pr.user_id as reactor_id, pr.created_at, p.author_id
  from public.post_reactions pr
  join public.posts p on p.id = pr.post_id
  where p.author_id <> pr.user_id
    and not exists (
      select 1 from public.reaction_point_awards rpa
      where rpa.item_type = 'post' and rpa.item_id = pr.post_id and rpa.reactor_profile_id = pr.user_id
    )
),
inserted_awards as (
  insert into public.reaction_point_awards (item_type, item_id, reactor_profile_id, awarded_at)
  select 'post', post_id, reactor_id, created_at from eligible_post_reactions
  on conflict do nothing
  returning item_id, reactor_profile_id
),
ranked as (
  select e.*,
    row_number() over (partition by e.author_id, date_trunc('day', e.created_at) order by e.created_at) as daily_rank
  from eligible_post_reactions e
  join inserted_awards a on a.item_id = e.post_id and a.reactor_profile_id = e.reactor_id
)
insert into public.point_events (profile_id, event_type, points, source_type, source_id, created_at, metadata)
select author_id, 'reaction_received', 1, 'post', post_id, created_at, jsonb_build_object('reactor_profile_id', reactor_id)
from ranked
where daily_rank <= 10;

-- Comment reactions — identical shape, comment_reactions/comments instead.
with eligible_comment_reactions as (
  select cr.comment_id, cr.user_id as reactor_id, cr.created_at, c.author_id
  from public.comment_reactions cr
  join public.comments c on c.id = cr.comment_id
  where c.author_id <> cr.user_id
    and not exists (
      select 1 from public.reaction_point_awards rpa
      where rpa.item_type = 'comment' and rpa.item_id = cr.comment_id and rpa.reactor_profile_id = cr.user_id
    )
),
inserted_awards as (
  insert into public.reaction_point_awards (item_type, item_id, reactor_profile_id, awarded_at)
  select 'comment', comment_id, reactor_id, created_at from eligible_comment_reactions
  on conflict do nothing
  returning item_id, reactor_profile_id
),
ranked as (
  select e.*,
    row_number() over (partition by e.author_id, date_trunc('day', e.created_at) order by e.created_at) as daily_rank
  from eligible_comment_reactions e
  join inserted_awards a on a.item_id = e.comment_id and a.reactor_profile_id = e.reactor_id
)
insert into public.point_events (profile_id, event_type, points, source_type, source_id, created_at, metadata)
select author_id, 'reaction_received', 1, 'comment', comment_id, created_at, jsonb_build_object('reactor_profile_id', reactor_id)
from ranked
where daily_rank <= 10;
