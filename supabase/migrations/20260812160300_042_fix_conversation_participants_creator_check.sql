-- ============================================================================
-- 042_fix_conversation_participants_creator_check
--
-- Safety Loop phase — a real, pre-existing bug found via live testing while
-- verifying migration 040's block-enforcement changes (not introduced by
-- them, but surfaced because migration 040 re-issued this exact policy's
-- text verbatim via ALTER POLICY, so it's mine to fix now that it's found).
--
-- The policy's "or the conversation's creator can add someone" branch was
-- written as a raw inline subquery:
--   (select auth.uid()) = (select conversations.created_by from conversations where ...)
-- This subquery is NOT security-definer, so it's fully subject to
-- conversations' own SELECT policy ("Participants can read their
-- conversations" — requires an EXISTING conversation_participants row).
-- Immediately after creating a brand new conversation, before any
-- participant row exists, the creator can't yet SELECT their own
-- just-created conversation row — so this branch silently evaluated to
-- NULL (never true), and adding the SECOND participant to a new DM (the
-- other party) depended entirely on it. Confirmed live: a 2-row
-- conversation_participants insert for a fresh DM failed with an RLS
-- violation before this fix.
--
-- Fix: use is_conversation_creator(conversation_id) — the SECURITY DEFINER
-- helper that already existed for exactly this check (migration 013) and
-- bypasses the same chicken-and-egg problem by design. Same authorization
-- semantics, just evaluated correctly.
-- ============================================================================

alter policy "Join self, or be added by creator/admin"
  on public.conversation_participants
  with check (
    (
      (profile_id = (select auth.uid()))
      or is_conversation_creator(conversation_id)
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
