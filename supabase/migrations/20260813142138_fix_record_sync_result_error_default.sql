-- Follow-up to add_sync_status: `p_error text` with no DEFAULT is treated
-- by Supabase's TypeScript codegen as a required, non-nullable argument —
-- even though Postgres itself accepts NULL for any plain `text` param
-- without an explicit NOT NULL constraint. sync.ts's recordSyncResult()
-- legitimately needs to pass `null` on a successful sync (clearing any
-- previously-recorded error), so the generated type must reflect that
-- it's optional. Same function body, only the signature changes.
create or replace function public.record_sync_result(p_key text, p_ok boolean, p_error text default null)
returns void
language plpgsql
as $$
begin
  update sync_status
  set last_succeeded_at = case when p_ok then now() else last_succeeded_at end,
      last_error = case when p_ok then null else p_error end
  where key = p_key;
end;
$$;
