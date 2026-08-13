-- ============================================================================
-- 032_scope_message_notifications_to_dms
--
-- Master Product Completion Phase — cross-feature integration finding.
-- notify_on_message() fans out a notification to EVERY other participant
-- for EVERY message, with no distinction by conversation kind. That was
-- harmless while Fan Rooms had a handful of members, but it is exactly the
-- "notification for every ordinary room message" spam this same phase's
-- brief explicitly warns against (section 10) — a busy room with 100+
-- members would otherwise notify all 100+ people for every single message.
--
-- Fix: the blanket fan-out now only applies to dm/group_dm (where it was
-- always correct — 1-2 other recipients). For community_room/regional_room
-- messages, no blanket notification is produced; instead, a reply to a
-- specific message notifies only that message's original sender (type
-- 'reply', subject_type 'message') — the same "someone replied to you"
-- signal comments already produce, not a room-wide broadcast. Ordinary
-- (non-reply) room messages produce no notification at all, matching the
-- explicit instruction. @mentions are unaffected (notify_on_mention is a
-- separate trigger, already correctly targeted).
-- ============================================================================

create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_kind text;
begin
  select kind into v_kind from public.conversations where id = new.conversation_id;

  if v_kind in ('dm', 'group_dm') then
    insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
    select cp.profile_id, new.sender_id, 'message', 'conversation', new.conversation_id
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.profile_id <> new.sender_id;
  elsif new.parent_message_id is not null then
    insert into public.notifications (recipient_id, actor_id, type, subject_type, subject_id)
    select p.sender_id, new.sender_id, 'reply', 'message', new.conversation_id
    from public.messages p
    where p.id = new.parent_message_id
      and p.sender_id <> new.sender_id;
  end if;

  return new;
end;
$$;
