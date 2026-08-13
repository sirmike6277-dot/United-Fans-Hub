-- ============================================================================
-- 041_user_blocks_select_visible_to_both_parties
--
-- Safety Loop phase — a real gap found while building "full mutual block"'s
-- own enforcement: user_blocks' original SELECT policy ("Users can view
-- their own blocks") only ever exposed rows where blocker_id = auth.uid(),
-- so a blocked user had no way to learn they've been blocked *for the
-- purpose of hiding the blocker's own content from their feed* — the other
-- half of "mutual" hiding. Widened to blocker_id = auth.uid() OR
-- blocked_id = auth.uid(): each party can see blocks involving themselves,
-- in either role, but never a block between two OTHER people. This is not
-- a "notify the blocked user" feature (no notification row/UI event is
-- ever produced for being blocked — see migration/report) — it's the same
-- kind of side-effect visibility real "block" features always have (you
-- can tell you've lost access to someone's content), not a proactive alert.
-- ============================================================================

alter policy "Users can view their own blocks"
  on public.user_blocks
  using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));
