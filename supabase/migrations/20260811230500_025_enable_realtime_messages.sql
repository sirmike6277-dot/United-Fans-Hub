-- ============================================================================
-- 025_enable_realtime_messages
--
-- Phase 14 (Fan Rooms). Realtime was previously enabled on zero tables in
-- this project (a deliberate "not yet", per the Phase 12 audit — "Realtime
-- never enabled on this project"). Fan Rooms and DMs both need live message
-- delivery without a manual refresh, so this adds `messages` to Supabase's
-- `supabase_realtime` publication.
--
-- Security note: this changes what's *replicated*, not who can *read* it.
-- Supabase's Realtime "Postgres Changes" feature evaluates each subscribed
-- client's own JWT against the table's existing RLS SELECT policy
-- ("Participants can read messages") before delivering any change to that
-- client — the exact same participant-only boundary already enforced for
-- normal reads. A non-participant cannot subscribe to a conversation's
-- messages via Realtime any more than they could SELECT them directly.
-- ============================================================================

alter publication supabase_realtime add table public.messages;
