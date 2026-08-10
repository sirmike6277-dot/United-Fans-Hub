-- is_conversation_participant/is_conversation_admin always evaluate against
-- auth.uid(), which is null for anon — they can never return true for an
-- unauthenticated caller. Granting EXECUTE to anon makes RLS policies that
-- reference them fail closed with an empty result set (consistent with the
-- rest of this schema's public-readable/blocked patterns) instead of a raw
-- 42501 permission-denied error, which is confusing but not insecure either
-- way. Same posture as the existing has_role() grants.
grant execute on function public.is_conversation_participant(uuid) to anon;
grant execute on function public.is_conversation_admin(uuid) to anon;