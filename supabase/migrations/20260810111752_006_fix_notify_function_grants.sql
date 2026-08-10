-- Fix: the notify_on_* trigger functions must never be directly RPC-callable
-- by client roles — trigger invocation doesn't require EXECUTE grants on the
-- invoking role, only the underlying statement (insert on the source table)
-- needs its own RLS/insert policy, which already exists independently.
revoke execute on function public.notify_on_follow() from public, anon, authenticated;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
revoke execute on function public.notify_on_post_reaction() from public, anon, authenticated;
revoke execute on function public.notify_on_comment_reaction() from public, anon, authenticated;
revoke execute on function public.notify_on_mention() from public, anon, authenticated;
revoke execute on function public.notify_on_message() from public, anon, authenticated;
