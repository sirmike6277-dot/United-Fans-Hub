-- ============================================================================
-- 040_block_enforcement_dms_messages_mentions
--
-- Safety Loop phase — "full mutual block" (confirmed with the user): blocking
-- prevents new DMs in both directions, blocks sending new messages into an
-- EXISTING dm/group_dm once either party has blocked the other, and blocks
-- new mentions between the two parties in either direction. All enforced in
-- RLS/triggers, not just hidden in the UI — a direct API call is rejected
-- exactly the same as a UI action would be.
--
-- Fan Room message VISIBILITY-hiding (the other half of "full mutual
-- block") is deliberately NOT done at the RLS/SELECT level — see the Phase
-- report for why (moderator visibility, reply-context resolution) — it's
-- done as a real, server-fetched-then-filtered data-layer step instead
-- (lib/moderation/blocks.ts's fetchHiddenProfileIds, applied in
-- messages.ts/posts.ts). Blocking does NOT remove either party from a
-- shared Fan Room, does NOT affect Members-directory search, and does NOT
-- affect Award nominations — a blocked user can still be found and
-- nominated; only DMs/room-message-visibility/mentions are covered, by
-- deliberate, disclosed scope decision.
--
-- has_mutual_block(a, b): the general two-party check, reused everywhere.
-- has_blocked_participant_in_conversation(conversation, profile): the
-- conversation-aware wrapper — false for any non-dm/group_dm kind, so it's
-- always safe to AND into a policy regardless of conversation type.
-- ============================================================================

create or replace function public.has_mutual_block(p_profile_a uuid, p_profile_b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (select 1 from public.user_blocks where blocker_id = p_profile_a and blocked_id = p_profile_b)
      or exists (select 1 from public.user_blocks where blocker_id = p_profile_b and blocked_id = p_profile_a);
$$;

grant execute on function public.has_mutual_block(uuid, uuid) to authenticated;

create or replace function public.has_blocked_participant_in_conversation(p_conversation_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_participants cp on cp.conversation_id = c.id and cp.profile_id <> p_profile_id
    where c.id = p_conversation_id
      and c.kind in ('dm', 'group_dm')
      and public.has_mutual_block(p_profile_id, cp.profile_id)
  );
$$;

grant execute on function public.has_blocked_participant_in_conversation(uuid, uuid) to authenticated;

-- 1. New DMs/participants: extends the existing room-ban guard with the
-- same shape (an additional AND condition), rather than replacing it.
alter policy "Join self, or be added by creator/admin"
  on public.conversation_participants
  with check (
    (
      (profile_id = (select auth.uid()))
      or ((select auth.uid()) = (select conversations.created_by from conversations where conversations.id = conversation_participants.conversation_id))
      or is_conversation_admin(conversation_id)
    )
    and not exists (
      select 1 from room_bans rb
      where rb.conversation_id = conversation_participants.conversation_id
        and rb.profile_id = conversation_participants.profile_id
        and (rb.banned_until is null or rb.banned_until > now())
    )
    and not public.has_blocked_participant_in_conversation(conversation_participants.conversation_id, conversation_participants.profile_id)
  );

-- 2. New messages into an existing dm/group_dm — blocked once either party
-- has blocked the other, even though the conversation itself predates the
-- block. Fan Room messages are unaffected (has_blocked_participant_in_conversation
-- is always false for room-kind conversations).
alter policy "Participants can send messages"
  on public.messages
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = (select auth.uid()))
    and not public.has_blocked_participant_in_conversation(messages.conversation_id, (select auth.uid()))
  );

-- 3. Mentions — blocked in either direction, across posts/comments/messages.
alter policy "Authors can mention users in their own content"
  on public.mentions
  with check (
    (
      (post_id is not null)
      and ((select auth.uid()) = (select posts.author_id from posts where posts.id = mentions.post_id))
      and not public.has_mutual_block((select auth.uid()), mentioned_profile_id)
    )
    or (
      (comment_id is not null)
      and ((select auth.uid()) = (select comments.author_id from comments where comments.id = mentions.comment_id))
      and not public.has_mutual_block((select auth.uid()), mentioned_profile_id)
    )
    or (
      (message_id is not null)
      and ((select auth.uid()) = (select messages.sender_id from messages where messages.id = mentions.message_id))
      and exists (
        select 1 from conversation_participants cp
        where cp.conversation_id = (select m.conversation_id from messages m where m.id = mentions.message_id)
          and cp.profile_id = mentions.mentioned_profile_id
      )
      and not public.has_mutual_block((select auth.uid()), mentioned_profile_id)
    )
  );
