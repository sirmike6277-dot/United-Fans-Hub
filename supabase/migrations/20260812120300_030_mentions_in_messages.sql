-- ============================================================================
-- 030_mentions_in_messages
--
-- Master Product Completion Phase J — Mentions. Widens the existing
-- `mentions` table (already used for posts/comments — see the original
-- Community phase) to also cover messages, rather than building a second,
-- competing mentions system. The post_id/comment_id branches of every
-- predicate below are reproduced byte-for-byte from the existing, already-
-- verified policy — only a new message_id branch is added.
--
-- The message branch adds one thing the post/comment branches don't need:
-- the mentioned profile must actually be a participant of the message's
-- conversation. Posts/comments are public, so mentioning "anyone" there
-- never leaks anything; a Fan Room message is private to its members, so
-- mentioning a non-member would otherwise let an outsider learn the room
-- exists and receive a notification about content they can't even read.
-- ============================================================================

alter table public.mentions
  add column message_id uuid null references public.messages(id) on delete cascade;

alter table public.mentions drop constraint mentions_check;
alter table public.mentions add constraint mentions_check
  check (num_nonnulls(post_id, comment_id, message_id) = 1);

alter policy "Authors can mention users in their own content" on public.mentions
  with check (
    (
      (post_id is not null)
      and ((select auth.uid()) = (select posts.author_id from posts where posts.id = mentions.post_id))
    )
    or (
      (comment_id is not null)
      and ((select auth.uid()) = (select comments.author_id from comments where comments.id = mentions.comment_id))
    )
    or (
      (message_id is not null)
      and ((select auth.uid()) = (select messages.sender_id from messages where messages.id = mentions.message_id))
      and exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = (select m.conversation_id from public.messages m where m.id = mentions.message_id)
          and cp.profile_id = mentions.mentioned_profile_id
      )
    )
  );

-- notify_on_mention(): extended for the message case (recipient = the
-- mentioned member, actor = the real sender — re-derived server-side, same
-- as the post/comment branches always have been, never trusted from the
-- client). The post/comment branches are otherwise unchanged from the
-- original function — same recipient/actor/self-mention-guard behavior.
create or replace function public.notify_on_mention()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_author uuid;
  v_subject_type text;
  v_subject_id uuid;
begin
  if new.post_id is not null then
    select author_id into v_author from public.posts where id = new.post_id;
    v_subject_type := 'post';
    v_subject_id := new.post_id;
  elsif new.comment_id is not null then
    select author_id into v_author from public.comments where id = new.comment_id;
    v_subject_type := 'comment';
    v_subject_id := new.comment_id;
  else
    select sender_id into v_author from public.messages where id = new.message_id;
    v_subject_type := 'message';
    v_subject_id := new.message_id;
  end if;

  if new.mentioned_profile_id <> v_author then
    insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
    values (new.mentioned_profile_id, v_author, 'mention', v_subject_type, v_subject_id);
  end if;

  return new;
end;
$$;
