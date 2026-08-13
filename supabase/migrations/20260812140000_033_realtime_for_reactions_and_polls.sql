-- ============================================================================
-- 033_realtime_for_reactions_and_polls
--
-- Phase 17 — extends Realtime (already enabled for `messages`, migration
-- 025) to message_reactions and room_polls, so reaction changes and new
-- polls can be pushed to clients without a hard refresh.
--
-- Deliberately NOT added: room_poll_votes. Its own RLS ("Users can see
-- their own vote") only ever lets a subscriber receive change events about
-- their OWN vote row (Realtime respects each subscriber's RLS), so there is
-- no way for this table's realtime feed to tell a room "someone else just
-- voted" — the aggregate is only ever available via room_poll_results(), a
-- function, which Realtime cannot subscribe to at all. This is a genuine,
-- disclosed limitation (see Phase 17 report), not an oversight: adding the
-- table to the publication would not fix it, since RLS still applies to
-- what Realtime delivers, and weakening that RLS to expose other users'
-- votes is explicitly out of scope. A lightweight client-side poll refresh
-- substitutes for live vote-total updates in the UI layer instead.
--
-- room_poll_options is also not added: its rows only change once (created
-- alongside the poll, immutable after), so there's nothing to subscribe to
-- beyond the poll's own INSERT, which the client already re-fetches in full
-- (question + options + results) the moment it learns a new poll exists.
-- ============================================================================

alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.room_polls;
