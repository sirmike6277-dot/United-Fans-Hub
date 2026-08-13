-- ============================================================================
-- 035_award_manager_gate_and_self_nomination_guard
--
-- Phase 18 — two fixes to the existing award schema (migration 009), found
-- during inspection, both following established conventions from elsewhere
-- in this project rather than inventing new ones:
--
-- 1. has_role() does an EXACT role-key match only (confirmed live — no
--    super_admin bypass baked into the function itself). Every other
--    role-gated feature in this app (room polls, room moderation, match
--    sync) explicitly ORs has_role('super_admin') alongside its own
--    specific role check — award_categories/award_periods/award_nominations
--    (UPDATE)/award_winners never did that, meaning a super_admin could not
--    actually operate the awards feature at all (and there is still no UI
--    anywhere to grant the award_manager role itself). This brings awards
--    in line with the same convention.
-- 2. Self-nomination was never blocked (only self-*voting* was, in the
--    existing award_votes INSERT policy). For consistency with that
--    existing decision — Fan of the Month/Season is meant to be peer-
--    recognition, not self-promotion — this adds the same guard one step
--    earlier, at nomination time.
--
-- Also adds an optional short "reason" to a nomination (Phase 18's own
-- spec asks for one) — additive column, nothing currently reads/writes it.
-- ============================================================================

alter table public.award_nominations
  add column reason text null check (reason is null or length(btrim(reason)) <= 280);

alter policy "Award managers manage categories"
  on public.award_categories
  using (public.has_role('award_manager') or public.has_role('super_admin'))
  with check (public.has_role('award_manager') or public.has_role('super_admin'));

alter policy "Award managers manage periods"
  on public.award_periods
  using (public.has_role('award_manager') or public.has_role('super_admin'))
  with check (public.has_role('award_manager') or public.has_role('super_admin'));

alter policy "Award managers approve or reject nominations"
  on public.award_nominations
  using (public.has_role('award_manager') or public.has_role('super_admin'))
  with check (public.has_role('award_manager') or public.has_role('super_admin'));

alter policy "Award managers record winners"
  on public.award_winners
  with check (public.has_role('award_manager') or public.has_role('super_admin'));

alter policy "Members can nominate; managers can nominate for anyone"
  on public.award_nominations
  with check (
    (
      nominated_by = (select auth.uid())
      and nominee_profile_id <> (select auth.uid())
    )
    or public.has_role('award_manager')
    or public.has_role('super_admin')
  );
