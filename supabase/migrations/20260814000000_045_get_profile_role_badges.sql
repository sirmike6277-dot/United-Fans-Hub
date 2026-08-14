-- 045: a narrow, public, read-only function for role-badge display (super
-- admin, moderator, content/match/award manager tags next to a member's
-- name).
--
-- user_roles itself deliberately has NO public SELECT policy (migration
-- 001's own comment: "default-deny for anon/authenticated on every
-- command" -- only a super_admin can read the full grants table, per
-- migration 024). That's still correct: granted_at/granted_by are
-- operational/audit data, not something every visitor should be able to
-- query in bulk. But *which* roles a profile publicly holds is exactly the
-- kind of thing a "Moderator" or "Super Admin" badge is supposed to show
-- everyone -- so rather than loosening user_roles' own RLS, this exposes a
-- narrower, purpose-built function with only the two columns badge display
-- actually needs, matching the exact pattern public.has_role() already
-- established.
--
-- (First attempt at this used a SECURITY DEFINER view instead of a
-- function -- the Supabase security linter flags that shape as an ERROR
-- (security_definer_view), the only one it would have raised in this
-- schema. A function in the same shape as has_role() only trips the much
-- more common WARN-level anon_security_definer_function_executable lint,
-- already accepted throughout this schema.)
--
-- Takes an array so the feed/profile/comments call sites can batch-fetch
-- badges for every author on a page in one round trip, rather than one
-- query per author.
create function public.get_profile_role_badges(target_profile_ids uuid[])
returns table (profile_id uuid, role_key text, role_name text)
language sql
security definer
set search_path = public
stable
as $$
  select ur.profile_id, r.key, r.name
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.profile_id = any(target_profile_ids);
$$;

revoke all on function public.get_profile_role_badges(uuid[]) from public;
grant execute on function public.get_profile_role_badges(uuid[]) to anon, authenticated;
