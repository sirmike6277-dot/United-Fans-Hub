-- Pin search_path on the updated_at trigger function (was mutable).
create or replace function public.handle_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user is SECURITY DEFINER and only meant to run via the
-- on_auth_user_created trigger — triggers invoke it regardless of grants,
-- so revoking direct EXECUTE closes off calling it as a public RPC
-- (/rest/v1/rpc/handle_new_user) to insert/overwrite arbitrary profile rows.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
