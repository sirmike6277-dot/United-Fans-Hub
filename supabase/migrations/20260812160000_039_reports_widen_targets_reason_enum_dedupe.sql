-- ============================================================================
-- 039_reports_widen_targets_reason_enum_dedupe
--
-- Safety Loop phase. `reports` already existed (migration 010) with exactly
-- the shape this phase's brief asks for (reporter_id/target_type/target_id/
-- reason/details/status/resolved_at/resolved_by) — this migration only
-- widens what it already does, reusing rather than replacing:
--
-- 1. target_type CHECK widened from ('post','comment','user','message') to
--    also allow 'room','poll','nomination' — the brief's own reportable-
--    target list. moderation_actions.target_type is deliberately left
--    unchanged (still post/comment/user/message): an action taken in
--    response to a room/poll/nomination report always targets either the
--    underlying content's author ('user') or a specific message, never the
--    abstract room/poll/nomination itself as a moderation-action target.
-- 2. reason CHECK added (spam/harassment/hate_speech/impersonation/other) —
--    the brief asks for this as an enum; the column itself was already
--    free text with only a non-empty check, so this narrows rather than
--    adds a column. `details` (already existing, unchanged) is where the
--    optional free-text elaboration goes.
-- 3. A UNIQUE(reporter_id, target_type, target_id) constraint — confirmed
--    with the user: a second report of the same content by the same
--    reporter is blocked outright, not merely deduped for display.
-- ============================================================================

alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type = any (array['post','comment','user','message','room','poll','nomination']));

alter table public.reports drop constraint reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason = any (array['spam','harassment','hate_speech','impersonation','other']));

alter table public.reports add constraint reports_reporter_target_unique
  unique (reporter_id, target_type, target_id);

alter publication supabase_realtime add table public.reports;
