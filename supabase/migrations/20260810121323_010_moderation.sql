-- ============================================================================
-- 010_moderation
-- reports, moderation_actions, user_blocks, user_mutes
-- Per docs/architecture/database-architecture-proposal.md §C.9, §D, §Q
-- ============================================================================

-- ----------------------------------------------------------------------------
-- reports (member-initiated)
-- ----------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('post', 'comment', 'user', 'message')),
  target_id uuid not null,
  reason text not null check (length(btrim(reason)) > 0),
  details text,
  status text not null default 'open' check (status in ('open', 'under_review', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

comment on table public.reports is
  'Member-filed reports against content or users. reporter_id/resolved_by intentionally NO ACTION/SET NULL (not CASCADE) so the report survives account deletion, matching the moderation audit-trail precedent set by messages.sender_id/conversations.created_by.';
comment on column public.reports.target_id is
  'Polymorphic, paired with target_type. Deliberate integrity trade-off per proposal §V — see notifications.subject_id for the same pattern.';

create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_target_idx on public.reports (target_type, target_id);
create index reports_open_idx on public.reports (created_at) where status in ('open', 'under_review');

alter table public.reports enable row level security;

-- Reporters see their own filed reports; moderators/admins see all.
create policy "Reporters and moderators can view reports"
  on public.reports for select
  using (
    (select auth.uid()) = reporter_id
    or public.has_role('moderator')
    or public.has_role('super_admin')
  );

-- Any authenticated member can file a report, only as themselves.
create policy "Members can file reports as themselves"
  on public.reports for insert
  with check ((select auth.uid()) = reporter_id);

-- Only moderators/admins can update report status/resolution.
create policy "Moderators can update report status"
  on public.reports for update
  using (public.has_role('moderator') or public.has_role('super_admin'))
  with check (public.has_role('moderator') or public.has_role('super_admin'));

-- No delete policy: reports are a permanent record, dismissed via `status`, not removed.

-- ----------------------------------------------------------------------------
-- moderation_actions (staff-initiated, optionally linked to a report)
-- System-only table per proposal §D: "no insert/update/delete grant to
-- anon/authenticated whatsoever — writes happen exclusively through
-- SECURITY DEFINER functions/triggers/Edge Functions."
-- ----------------------------------------------------------------------------
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('post', 'comment', 'user', 'message')),
  target_id uuid not null,
  action_type text not null check (
    action_type in ('content_removed', 'user_warned', 'user_suspended', 'user_banned', 'report_dismissed')
  ),
  reason text not null check (length(btrim(reason)) > 0),
  report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

comment on table public.moderation_actions is
  'Immutable staff moderation audit log. No client INSERT/UPDATE/DELETE — rows are written exclusively by public.record_moderation_action(), which enforces the moderator role check. moderator_id is NO ACTION (not CASCADE) so the audit trail survives account deletion.';

create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);
create index moderation_actions_moderator_id_idx on public.moderation_actions (moderator_id);
create index moderation_actions_report_id_idx on public.moderation_actions (report_id);

alter table public.moderation_actions enable row level security;

-- Staff-only visibility. No insert/update/delete policy for any client role —
-- combined with RLS being enabled, this makes the table fully unwritable by
-- anon/authenticated regardless of the default Supabase table grants.
create policy "Moderators can view moderation actions"
  on public.moderation_actions for select
  using (public.has_role('moderator') or public.has_role('super_admin'));

-- ----------------------------------------------------------------------------
-- user_blocks — symmetric-shape relationship table, owner-managed
-- ----------------------------------------------------------------------------
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

comment on table public.user_blocks is
  'Bilateral relationship rows, CASCADE on both sides like follows. Visibility is deliberately restricted to the blocker only (see policy) — the blocked party is not shown who blocked them, a conventional privacy default not to be relaxed without an explicit product decision.';

create index user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy "Users can view their own blocks"
  on public.user_blocks for select
  using ((select auth.uid()) = blocker_id);

create policy "Users can block as themselves"
  on public.user_blocks for insert
  with check ((select auth.uid()) = blocker_id);

create policy "Users can unblock as themselves"
  on public.user_blocks for delete
  using ((select auth.uid()) = blocker_id);

-- ----------------------------------------------------------------------------
-- user_mutes — same shape as user_blocks, softer semantics (hides content,
-- no mutual interaction bar)
-- ----------------------------------------------------------------------------
create table public.user_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

comment on table public.user_mutes is
  'Same shape/visibility posture as user_blocks; softer semantics (hides content without a mutual interaction bar).';

create index user_mutes_muted_id_idx on public.user_mutes (muted_id);

alter table public.user_mutes enable row level security;

create policy "Users can view their own mutes"
  on public.user_mutes for select
  using ((select auth.uid()) = muter_id);

create policy "Users can mute as themselves"
  on public.user_mutes for insert
  with check ((select auth.uid()) = muter_id);

create policy "Users can unmute as themselves"
  on public.user_mutes for delete
  using ((select auth.uid()) = muter_id);

-- ----------------------------------------------------------------------------
-- record_moderation_action — the sole write path into moderation_actions.
-- SECURITY DEFINER with explicit search_path, schema-qualified references,
-- explicit role check (defense in depth even though only staff should ever
-- legitimately call this), minimal EXECUTE grant.
-- ----------------------------------------------------------------------------
create function public.record_moderation_action(
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
set search_path = public, pg_temp
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

  return v_action_id;
end;
$$;

comment on function public.record_moderation_action is
  'Only path that can write to moderation_actions. Verifies the caller holds moderator/super_admin before inserting. Deliberately does not also apply the action''s real-world effect (e.g. hiding content, suspending a user) — no such enforcement columns/logic exist yet in this schema; that is admin-dashboard scope, not part of this migration.';

revoke all on function public.record_moderation_action(text, uuid, text, text, uuid, timestamptz) from public;
grant execute on function public.record_moderation_action(text, uuid, text, text, uuid, timestamptz) to authenticated;
