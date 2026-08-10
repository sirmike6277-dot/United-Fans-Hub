-- ============================================================================
-- Bug fix for migration 005: conversation_participants had two policies that
-- self-referenced conversation_participants from within its own RLS
-- expression ("Participants can see co-participants" SELECT policy, and the
-- admin-add branch of the INSERT policy). Postgres cannot evaluate a same-
-- table self-join inside that table's own RLS policy — every query against
-- conversation_participants as an authenticated user fails with
-- "42P17: infinite recursion detected in policy for relation
-- conversation_participants". This transitively broke every table whose RLS
-- subqueries conversation_participants (conversations, messages,
-- message_media, and the new message-media/voice-messages storage policies),
-- i.e. the entire messaging system was unusable for authenticated users.
--
-- Discovered while behaviorally testing the new storage bucket policies
-- (011_storage_buckets), not caused by them — this predates that migration.
--
-- Fix: the standard Supabase pattern for this exact problem — move the
-- membership check into a SECURITY DEFINER function. The function is owned
-- by postgres, which bypasses RLS on conversation_participants (ownership
-- bypass, since relforcerowsecurity is false, matching every other table in
-- this schema), breaking the recursive cycle. Each function checks only
-- "is auth.uid() a participant/admin of this conversation" — no parameter to
-- check an arbitrary other profile, so calling it directly via RPC can't be
-- used to enumerate other users' conversation membership.
-- ============================================================================

create function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.profile_id = auth.uid()
  );
$$;

create function public.is_conversation_admin(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.profile_id = auth.uid()
      and cp.role = 'admin'
  );
$$;

comment on function public.is_conversation_participant is
  'SECURITY DEFINER membership check used by RLS policies that need to test conversation_participants membership without triggering that table''s own (self-referencing) RLS policy, which causes infinite recursion (42P17) if queried directly from within its own policy. Always checks auth.uid(), never an arbitrary profile.';
comment on function public.is_conversation_admin is
  'Same rationale as is_conversation_participant, for the admin-role check used by the conversation_participants INSERT policy.';

revoke all on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;
revoke all on function public.is_conversation_admin(uuid) from public, anon;
grant execute on function public.is_conversation_admin(uuid) to authenticated;

-- Replace the two broken policies to use the helper functions instead of a
-- raw self-join.
drop policy "Participants can see co-participants" on public.conversation_participants;
create policy "Participants can see co-participants"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id));

drop policy "Join self, or be added by creator/admin" on public.conversation_participants;
create policy "Join self, or be added by creator/admin"
  on public.conversation_participants for insert
  with check (
    profile_id = (select auth.uid())
    or (select auth.uid()) = (select created_by from public.conversations where id = conversation_participants.conversation_id)
    or public.is_conversation_admin(conversation_id)
  );

-- The new message-media/voice-messages storage policies (011_storage_buckets)
-- queried conversation_participants directly with a raw EXISTS, which would
-- hit the same recursion. Replace with the helper function for consistency
-- and to avoid depending on conversation_participants' own RLS at all.
drop policy "Conversation participants can view message media" on storage.objects;
create policy "Conversation participants can view message media"
  on storage.objects for select
  using (
    bucket_id = 'message-media'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy "Conversation participants can upload message media" on storage.objects;
create policy "Conversation participants can upload message media"
  on storage.objects for insert
  with check (
    bucket_id = 'message-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy "Conversation participants can view voice messages" on storage.objects;
create policy "Conversation participants can view voice messages"
  on storage.objects for select
  using (
    bucket_id = 'voice-messages'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy "Conversation participants can upload voice messages" on storage.objects;
create policy "Conversation participants can upload voice messages"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-messages'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );