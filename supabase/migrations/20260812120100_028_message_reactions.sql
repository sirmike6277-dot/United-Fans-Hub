-- ============================================================================
-- 028_message_reactions
--
-- Master Product Completion Phase H — Message Reactions. New table (no
-- existing reactions table applies: post_reactions/comment_reactions are on
-- publicly-readable content and have no notion of conversation privacy).
-- One reaction per user per message (PK (message_id, profile_id)) — a
-- changed reaction is an UPDATE, not a second row; this is what makes
-- "duplicate reactions" structurally impossible rather than merely
-- discouraged. Fixed emoji set, matching the phase brief's own suggestion.
-- ============================================================================

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🔥', '⚽')),
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create index idx_message_reactions_message on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

-- Same participant boundary as messages/message_media — reactions on a
-- private conversation's messages are not public, unlike post/comment
-- reactions.
create policy "Conversation participants can view message reactions"
  on public.message_reactions for select to authenticated
  using (exists (
    select 1 from public.messages m
    join public.conversation_participants cp on cp.conversation_id = m.conversation_id
    where m.id = message_reactions.message_id and cp.profile_id = (select auth.uid())
  ));

create policy "Conversation participants can react to live messages"
  on public.message_reactions for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.messages m
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = message_id and cp.profile_id = (select auth.uid()) and m.deleted_at is null
    )
  );

create policy "Users can change their own reaction"
  on public.message_reactions for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.messages m where m.id = message_id and m.deleted_at is null
    )
  );

create policy "Users can remove their own reaction"
  on public.message_reactions for delete to authenticated
  using (profile_id = (select auth.uid()));
