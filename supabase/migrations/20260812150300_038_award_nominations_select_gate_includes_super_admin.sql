-- ============================================================================
-- 038_award_nominations_select_gate_includes_super_admin
--
-- Phase 18 — a real bug found via live RLS testing, not just an inspection
-- guess: migration 035 added has_role('super_admin') to award_nominations'
-- UPDATE policy, but PostgreSQL RLS for UPDATE/DELETE requires a row to
-- also satisfy the table's SELECT policy before the UPDATE-specific USING
-- clause is even consulted (the executor's initial scan for candidate rows
-- is itself subject to SELECT-level RLS). award_nominations' own SELECT
-- policy ("Approved nominations are publicly readable") only ever included
-- has_role('award_manager') — never super_admin — so a super_admin could
-- pass the UPDATE policy's own check but still update zero rows, because
-- they could never *see* a pending nomination to begin with. Confirmed
-- live: a plain SELECT of a pending nomination as a super_admin (not also
-- award_manager) returned zero rows before this fix.
-- ============================================================================

alter policy "Approved nominations are publicly readable"
  on public.award_nominations
  using (
    status = 'approved'
    or nominated_by = (select auth.uid())
    or nominee_profile_id = (select auth.uid())
    or public.has_role('award_manager')
    or public.has_role('super_admin')
  );
