-- Corrective: `revoke all ... from public` does not strip Supabase's default
-- per-function grants to anon/authenticated (same lesson as
-- 006_fix_notify_function_grants). record_moderation_action must not be
-- executable by anon at all; authenticated is fine since the function's own
-- has_role() check gates non-staff callers.
revoke execute on function public.record_moderation_action(text, uuid, text, text, uuid, timestamptz) from public, anon;
grant execute on function public.record_moderation_action(text, uuid, text, text, uuid, timestamptz) to authenticated;