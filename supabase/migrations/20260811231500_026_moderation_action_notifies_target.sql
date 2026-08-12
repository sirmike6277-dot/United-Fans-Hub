-- ============================================================================
-- 026_moderation_action_notifies_target
--
-- Phase 14 (Fan Rooms). `notifications` has always been system-write-only
-- (no client INSERT policy exists, by design — every row is produced by a
-- SECURITY DEFINER trigger/function). record_moderation_action() already
-- exists and is correct (moderator/super_admin-gated, immutable ledger) but
-- never notified the affected user — the `moderation_action` notification
-- type has been declared in the notifications CHECK constraint since it was
-- first added, never produced by anything (confirmed in the Phase 12 audit).
--
-- This is a pure addition to the function body: when a moderation action
-- targets a user with a suspension/ban outcome, it now also inserts one
-- notification row, exactly like every notify_on_*() trigger already does.
-- No signature change, no behavior change to the existing insert, no RLS
-- change (still callable only by has_role('moderator') / has_role('super_admin'),
-- exactly as before).
-- ============================================================================

create or replace function public.record_moderation_action(
  p_target_type text,
  p_target_id uuid,
  p_action_type text,
  p_reason text,
  p_report_id uuid default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_action_id uuid;
begin
  if not (public.has_role('moderator') or public.has_role('super_admin')) then
    raise exception 'insufficient privileges to record a moderation action';
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action_type, reason, report_id, expires_at)
  values (auth.uid(), p_target_type, p_target_id, p_action_type, p_reason, p_report_id, p_expires_at)
  returning id into v_action_id;

  if p_target_type = 'user' and p_action_type in ('user_suspended', 'user_banned') then
    insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
    values (p_target_id, auth.uid(), 'moderation_action', 'user', p_target_id);
  end if;

  return v_action_id;
end;
$$;
