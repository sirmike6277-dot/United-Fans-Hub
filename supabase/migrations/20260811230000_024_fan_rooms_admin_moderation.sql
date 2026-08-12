-- ============================================================================
-- 024_fan_rooms_admin_moderation
--
-- Phase 14 (Fan Rooms). Four small, additive pieces — no existing table is
-- restructured, no existing policy is weakened, only narrowly extended.
-- Every predicate below reuses functions/patterns already proven elsewhere
-- in this schema (has_role(), is_conversation_admin/creator(),
-- protect_conversation_participant_identity_and_role()'s own privilege set).
--
-- 1. user_roles RLS — confirmed live (Phase 12 audit) to have RLS enabled
--    with ZERO policies, meaning nobody, not even a super_admin, could grant
--    or revoke a role through the API. Fixes the "who operates this"
--    bootstrap problem the audit flagged, scoped to exactly what's needed:
--    a super_admin can manage anyone's roles; anyone can read their own.
--
-- 2. room_bans — new table. A moderator/admin "kick" (removing a
--    conversation_participants row) is otherwise meaningless for an
--    open-join room (the self-join policy lets them straight back in), so a
--    real suspend/ban needs a durable record independent of the membership
--    row it may coexist with or outlive. banned_until = null means
--    indefinite (until explicitly unbanned).
--
-- 3. Kick capability — conversation_participants had an UPDATE policy for
--    admins/creator/moderators/super_admin to manage participants, but NO
--    DELETE policy beyond "leave your own row". Adds the matching DELETE
--    policy with the identical predicate the UPDATE policy already uses.
--
-- 4. Ban-aware join — "Join self, or be added by creator/admin" is
--    replaced with the same three conditions plus one new AND NOT EXISTS
--    guard: an active ban blocks self-rejoin. This is a tightening (a
--    strict subset of what the old policy allowed), not a weakening.
--
-- 5. room_member_count() — community_rooms is publicly readable by design
--    (room discovery), but conversation_participants is deliberately
--    participant-only (DM privacy) — correct, and not weakened here. That
--    means a room's member count is unreadable to someone who hasn't
--    joined yet. This SECURITY DEFINER function exposes only the integer
--    count for a given conversation, and only when that conversation is
--    actually a community_room/regional_room — never usable to probe a
--    DM's participant count.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_roles RLS
-- ---------------------------------------------------------------------------

create policy "Users can read their own role grants"
  on public.user_roles
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "Super admins can read all role grants"
  on public.user_roles
  for select
  to authenticated
  using (public.has_role('super_admin'));

create policy "Super admins can grant roles"
  on public.user_roles
  for insert
  to authenticated
  with check (public.has_role('super_admin'));

create policy "Super admins can revoke roles"
  on public.user_roles
  for delete
  to authenticated
  using (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- 2. room_bans
-- ---------------------------------------------------------------------------

create table public.room_bans (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  banned_by uuid not null references public.profiles(id),
  banned_until timestamptz null, -- null = indefinite, until explicitly unbanned
  reason text null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

alter table public.room_bans enable row level security;

create policy "Room admins/moderators can view bans in their rooms"
  on public.room_bans
  for select
  to authenticated
  using (
    public.is_conversation_admin(conversation_id)
    or public.is_conversation_creator(conversation_id)
    or public.has_role('moderator')
    or public.has_role('super_admin')
  );

-- A banned user can see their own ban row (so the UI can tell them why they
-- can't rejoin, and when/whether it lifts) without seeing anyone else's.
create policy "Banned users can see their own ban"
  on public.room_bans
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "Room admins/moderators can ban"
  on public.room_bans
  for insert
  to authenticated
  with check (
    banned_by = (select auth.uid())
    and (
      public.is_conversation_admin(conversation_id)
      or public.is_conversation_creator(conversation_id)
      or public.has_role('moderator')
      or public.has_role('super_admin')
    )
  );

create policy "Room admins/moderators can unban"
  on public.room_bans
  for delete
  to authenticated
  using (
    public.is_conversation_admin(conversation_id)
    or public.is_conversation_creator(conversation_id)
    or public.has_role('moderator')
    or public.has_role('super_admin')
  );

-- ---------------------------------------------------------------------------
-- 3. Kick capability (conversation_participants DELETE)
-- ---------------------------------------------------------------------------

create policy "Conversation admins and moderators can remove participants"
  on public.conversation_participants
  for delete
  to authenticated
  using (
    public.is_conversation_admin(conversation_id)
    or public.is_conversation_creator(conversation_id)
    or public.has_role('moderator')
    or public.has_role('super_admin')
  );

-- ---------------------------------------------------------------------------
-- 4. Ban-aware join (tightens the existing INSERT policy)
-- ---------------------------------------------------------------------------

drop policy "Join self, or be added by creator/admin" on public.conversation_participants;

create policy "Join self, or be added by creator/admin"
  on public.conversation_participants
  for insert
  to authenticated
  with check (
    (
      profile_id = (select auth.uid())
      or (select auth.uid()) = (select created_by from public.conversations where id = conversation_id)
      or public.is_conversation_admin(conversation_id)
    )
    and not exists (
      select 1 from public.room_bans rb
      where rb.conversation_id = conversation_participants.conversation_id
        and rb.profile_id = conversation_participants.profile_id
        and (rb.banned_until is null or rb.banned_until > now())
    )
  );

-- ---------------------------------------------------------------------------
-- 5. room_member_count()
-- ---------------------------------------------------------------------------

create or replace function public.room_member_count(p_conversation_id uuid)
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and exists (
      select 1 from public.conversations c
      where c.id = p_conversation_id
        and c.kind in ('community_room', 'regional_room')
    );
$$;

grant execute on function public.room_member_count(uuid) to authenticated, anon;
