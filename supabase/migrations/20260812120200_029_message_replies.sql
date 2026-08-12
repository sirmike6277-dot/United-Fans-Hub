-- ============================================================================
-- 029_message_replies
--
-- Master Product Completion Phase I — Message Replies. Additive column, no
-- new table (mirrors comments.parent_comment_id exactly — same shape,
-- same ON DELETE SET NULL so a deleted parent doesn't cascade-delete the
-- reply, it just orphans gracefully). Two triggers close the two concrete
-- risks the phase brief calls out by name:
--
-- 1. validate_message_reply() — BEFORE INSERT: rejects a parent_message_id
--    that belongs to a different conversation ("Message A in Room 1 →
--    reply attached to Message B in Room 2" is exactly what this blocks).
-- 2. protect_message_thread_identity() — BEFORE UPDATE: once set, neither
--    conversation_id nor parent_message_id can be changed by anyone,
--    including the message's own sender editing their message body. This
--    closes a real latent gap: the existing "Senders can edit or soft-
--    delete their own messages" UPDATE policy has no explicit WITH CHECK,
--    so without this trigger a sender could silently retarget their own
--    message's conversation or parent while "editing" it.
-- ============================================================================

alter table public.messages
  add column parent_message_id uuid null references public.messages(id) on delete set null;

create index idx_messages_parent on public.messages(parent_message_id);

create or replace function public.validate_message_reply()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.parent_message_id is not null then
    if new.parent_message_id = new.id then
      raise exception 'a message cannot reply to itself';
    end if;
    if not exists (
      select 1 from public.messages p
      where p.id = new.parent_message_id and p.conversation_id = new.conversation_id
    ) then
      raise exception 'parent_message_id must belong to the same conversation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_validate_message_reply
before insert on public.messages
for each row execute function public.validate_message_reply();

create or replace function public.protect_message_thread_identity()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.conversation_id is distinct from old.conversation_id then
    raise exception 'messages.conversation_id cannot be changed';
  end if;
  if new.parent_message_id is distinct from old.parent_message_id then
    raise exception 'messages.parent_message_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger trg_protect_message_thread_identity
before update on public.messages
for each row execute function public.protect_message_thread_identity();
