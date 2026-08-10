-- 006: notifications (architecture proposal §C.5, §O)
-- Fed exclusively by triggers on source tables, never by direct client
-- insert — matches "not application code" in the proposal. Trigger
-- functions for prediction/match/award/badge events are added in their
-- own migrations (007/008/009) once those source tables exist; the `type`
-- check list already reserves those values now.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in (
    'like','comment','mention','reply','message','follow',
    'prediction_reminder','match_reminder','match_event',
    'award_nomination','voting_open','achievement_unlocked','moderation_action'
  )),
  subject_type text,
  subject_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient_created on public.notifications(recipient_id, created_at desc);
create index idx_notifications_unread on public.notifications(recipient_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "Users can read their own notifications"
  on public.notifications for select
  using (recipient_id = (select auth.uid()));

-- Self-service is limited to marking your own notifications read/unread —
-- no insert/delete policy exists for any client role; every row is
-- written only by the SECURITY DEFINER trigger functions below.
create policy "Users can update their own notifications"
  on public.notifications for update
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- follows → 'follow' notification
create function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
  values (new.following_id, new.follower_id, 'follow', 'profile', new.follower_id);
  return new;
end;
$$;
revoke all on function public.notify_on_follow() from public;

create trigger on_follow_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- comments → 'comment' (on a post) or 'reply' (on a comment), skipping self-notify
create function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_recipient uuid;
begin
  if new.parent_comment_id is null then
    select author_id into target_recipient from public.posts where id = new.post_id;
    if target_recipient is not null and target_recipient <> new.author_id then
      insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
      values (target_recipient, new.author_id, 'comment', 'post', new.post_id);
    end if;
  else
    select author_id into target_recipient from public.comments where id = new.parent_comment_id;
    if target_recipient is not null and target_recipient <> new.author_id then
      insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
      values (target_recipient, new.author_id, 'reply', 'comment', new.parent_comment_id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_on_comment() from public;

create trigger on_comment_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- post_reactions / comment_reactions → 'like', skipping self-notify
create function public.notify_on_post_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_recipient uuid;
begin
  select author_id into target_recipient from public.posts where id = new.post_id;
  if target_recipient is not null and target_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
    values (target_recipient, new.user_id, 'like', 'post', new.post_id);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_on_post_reaction() from public;

create trigger on_post_reaction_notify
  after insert on public.post_reactions
  for each row execute function public.notify_on_post_reaction();

create function public.notify_on_comment_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_recipient uuid;
begin
  select author_id into target_recipient from public.comments where id = new.comment_id;
  if target_recipient is not null and target_recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
    values (target_recipient, new.user_id, 'like', 'comment', new.comment_id);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_on_comment_reaction() from public;

create trigger on_comment_reaction_notify
  after insert on public.comment_reactions
  for each row execute function public.notify_on_comment_reaction();

-- mentions → 'mention', skipping self-mention
create function public.notify_on_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mentioned_profile_id <> (
    case when new.post_id is not null then (select author_id from public.posts where id = new.post_id)
         else (select author_id from public.comments where id = new.comment_id)
    end
  ) then
    insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
    values (
      new.mentioned_profile_id,
      case when new.post_id is not null then (select author_id from public.posts where id = new.post_id)
           else (select author_id from public.comments where id = new.comment_id) end,
      'mention',
      case when new.post_id is not null then 'post' else 'comment' end,
      coalesce(new.post_id, new.comment_id)
    );
  end if;
  return new;
end;
$$;
revoke all on function public.notify_on_mention() from public;

create trigger on_mention_notify
  after insert on public.mentions
  for each row execute function public.notify_on_mention();

-- messages → 'message', fan-out to every other participant
create function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
  select cp.profile_id, new.sender_id, 'message', 'conversation', new.conversation_id
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.profile_id <> new.sender_id;
  return new;
end;
$$;
revoke all on function public.notify_on_message() from public;

create trigger on_message_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();
