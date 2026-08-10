-- ============================================================================
-- 013_fix_conversation_participant_role_escalation
--
-- Fixes CRITICAL finding #2 from the pre-UI audit: any conversation
-- participant could directly UPDATE their own conversation_participants.role
-- from 'member' to 'admin' (self-promotion), because the existing "Users can
-- update their own participant row" policy has a USING clause but no
-- WITH CHECK, and RLS's WITH CHECK cannot reference the OLD row value
-- directly (only the NEW row), so "role must stay unchanged unless you're
-- already authorized" can't be expressed as a plain policy predicate without
-- an awkward self-referencing subquery. A BEFORE UPDATE trigger has native,
-- unambiguous access to OLD/NEW and is the right tool here.
--
-- Root cause note: the existing "own row" policy also structurally could
-- never let an admin/creator update *someone else's* participant row at all
-- (USING requires profile_id = auth.uid()) — so role management by an
-- authorized party had no working path either. This migration adds that
-- path as a separate, clearly-scoped policy.
-- ============================================================================

-- Helper: is the caller the creator of this conversation? Mirrors
-- is_conversation_participant/is_conversation_admin's shape (SECURITY
-- DEFINER, always keyed to auth.uid(), never an arbitrary profile — safe to
-- expose to anon/authenticated since it can never answer for anyone but the
-- calling session).
create function public.is_conversation_creator(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and c.created_by = auth.uid()
  );
$$;

comment on function public.is_conversation_creator is
  'SECURITY DEFINER: is auth.uid() the creator of this conversation? Used alongside is_conversation_admin/has_role to authorize conversation_participants role changes.';

revoke all on function public.is_conversation_creator(uuid) from public, anon;
grant execute on function public.is_conversation_creator(uuid) to authenticated;
grant execute on function public.is_conversation_creator(uuid) to anon;

-- ----------------------------------------------------------------------------
-- BEFORE UPDATE trigger: the actual enforcement. Runs regardless of which
-- RLS policy admitted the row, so it's a complete backstop independent of
-- policy structure.
-- ----------------------------------------------------------------------------
create function public.protect_conversation_participant_identity_and_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.conversation_id is distinct from old.conversation_id then
    raise exception 'conversation_participants.conversation_id cannot be changed';
  end if;
  if new.profile_id is distinct from old.profile_id then
    raise exception 'conversation_participants.profile_id cannot be changed';
  end if;

  if new.role is distinct from old.role then
    if not (
      public.is_conversation_admin(new.conversation_id)
      or public.is_conversation_creator(new.conversation_id)
      or public.has_role('moderator')
      or public.has_role('super_admin')
    ) then
      raise exception 'insufficient privileges to change conversation_participants.role';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.protect_conversation_participant_identity_and_role is
  'BEFORE UPDATE guard for conversation_participants: conversation_id/profile_id are immutable for everyone; role changes require the caller to already be an admin/creator of this conversation, or hold a global moderator/super_admin role. Fixes the self-promotion vulnerability found in the pre-UI audit.';

revoke all on function public.protect_conversation_participant_identity_and_role() from public, anon, authenticated;

create trigger protect_participant_identity_and_role
  before update on public.conversation_participants
  for each row
  execute function public.protect_conversation_participant_identity_and_role();

create policy "Conversation admins and moderators can manage participants"
  on public.conversation_participants for update
  using (
    public.is_conversation_admin(conversation_id)
    or public.is_conversation_creator(conversation_id)
    or public.has_role('moderator')
    or public.has_role('super_admin')
  )
  with check (
    public.is_conversation_admin(conversation_id)
    or public.is_conversation_creator(conversation_id)
    or public.has_role('moderator')
    or public.has_role('super_admin')
  );