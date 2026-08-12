-- ============================================================================
-- 015_secure_notifications_read_at_column
--
-- Fixes the vulnerability found in the Notifications UI verification pass:
-- the "Users can update their own notifications" policy has a USING and
-- WITH CHECK that both only constrain recipient_id = auth.uid() — nothing
-- restricts WHICH COLUMNS an owner may change. Confirmed live: an owner
-- could rewrite type/created_at (and, by the same gap, actor_id/
-- subject_type/subject_id) on their own row, not just read_at.
--
-- This is the same *shape* of problem as profiles.fan_points/fan_level
-- (012_secure_profiles_gamification_columns_fix): an unconditional,
-- role-independent "only this one column should ever be client-writable"
-- rule, not a conditional/authorization-dependent one (that's the
-- conversation_participants.role case, which needed a trigger instead).
-- Column-level grants are the correct minimal tool here.
--
-- Applying the lesson learned in that same profiles fix: a column-specific
-- REVOKE has no effect against a pre-existing TABLE-LEVEL GRANT (the
-- broader grant still covers every column regardless). Must revoke the
-- table-level UPDATE grant entirely first, then re-grant at column
-- granularity.
--
-- INSERT/DELETE grants are untouched — they were already fully blocked by
-- RLS (no INSERT/DELETE policy exists for any client role on this table),
-- same "grant is broad, RLS is the real gate" pattern already established
-- for point_events/moderation_actions/award_winners. Nothing here weakens
-- recipient_id isolation, adds INSERT capability, or touches the feeder
-- triggers.
-- ============================================================================

revoke update on public.notifications from authenticated, anon;

grant update (read_at) on public.notifications to authenticated, anon;

comment on column public.notifications.read_at is
  'The only column a client may ever update directly (see 015_secure_notifications_read_at_column). type/subject_type/subject_id/actor_id/recipient_id/created_at are set exclusively by the notify_on_* trigger functions.';