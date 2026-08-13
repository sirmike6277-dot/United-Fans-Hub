-- ============================================================================
-- 034_restrict_room_poll_creation_to_moderators
--
-- Phase 17 security finding: migration 027's original INSERT policy let any
-- room participant create a poll (deliberately, per that migration's own
-- CreatePollDialog comment: "matches posting a message"). Phase 17's brief
-- explicitly specifies "Moderator/admin creates poll" and requires testing
-- "unauthorized user cannot create a poll" / "authorized moderator can
-- create a poll" — this reverses that earlier design decision to match.
--
-- The permitted-role set mirrors the *same* predicate already used by this
-- table's own UPDATE policy ("Poll creator or room admin/moderator can
-- close a poll") and by RoomChat's/RoomMembersPanel's client-side
-- canModerate flag (myRole === 'admin' || has_role('moderator') ||
-- has_role('super_admin')) — not a new authorization concept, just applied
-- one step earlier, at creation instead of only at closing.
-- ============================================================================

alter policy "Room participants can create polls"
  on public.room_polls
  with check (
    created_by = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
    and (
      public.is_conversation_admin(conversation_id)
      or public.is_conversation_creator(conversation_id)
      or public.has_role('moderator')
      or public.has_role('super_admin')
    )
  );
