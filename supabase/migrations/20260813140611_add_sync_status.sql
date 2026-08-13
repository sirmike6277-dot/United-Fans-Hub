-- Production Football Data Architecture, Phase 1 — replaces sync.ts's
-- process-local in-memory staleness gate (a plain JS Map, see the file's
-- own long-standing doc comment disclosing this) with a real, persisted,
-- atomically-claimed lock. The in-memory version worked fine for a single
-- dev process but provides zero real protection on Vercel, where
-- concurrent requests can land on different serverless instances that
-- each have their own empty Map — every one of them would independently
-- decide "not stale, go fetch," multiplying real API-Football calls well
-- past the intended one-attempt-per-TTL-window throttle and risking the
-- account's confirmed 10/minute and 100/day caps.
--
-- `key` mirrors the exact strings sync.ts already used as Map keys
-- ("fixtures", "events:<matchId>", "lineups:<matchId>", "squad") — no
-- change to how callers name a sync target, only to where the state that
-- tracks it lives.
create table public.sync_status (
  key text primary key,
  last_attempted_at timestamptz,
  last_succeeded_at timestamptz,
  last_error text
);

alter table public.sync_status enable row level security;
-- Deliberately no policies at all — this is internal sync bookkeeping,
-- never read or written by an anon/authenticated client, only by
-- sync.ts's service-role client (same posture as prediction_scores' write
-- side: no client role has any access, by omission rather than an
-- explicit deny).

-- Atomically claims the right to attempt a sync for `p_key`: returns true
-- only if no one has (successfully) claimed it within the last
-- `p_ttl_seconds`. This single statement is what makes the guarantee real
-- under concurrency — a plain "SELECT last_attempted_at, then decide in
-- application code, then UPDATE" pair has a race window between the
-- SELECT and the UPDATE where two concurrent requests can both read
-- "stale" and both proceed to call the provider. Postgres's own
-- INSERT ... ON CONFLICT DO UPDATE ... WHERE ... evaluates the WHERE
-- guard as part of the same atomic statement, so of two (or two hundred)
-- concurrent callers for the same key, exactly one has its UPDATE clause
-- actually match and RETURNING fire — everyone else's ON CONFLICT target
-- row fails the WHERE guard, updates nothing, and returns no row.
create or replace function public.claim_sync_slot(p_key text, p_ttl_seconds int)
returns boolean
language plpgsql
as $$
declare
  v_claimed boolean := false;
begin
  insert into sync_status (key, last_attempted_at)
  values (p_key, now())
  on conflict (key) do update
    set last_attempted_at = now()
    where sync_status.last_attempted_at is null
       or sync_status.last_attempted_at < now() - make_interval(secs => p_ttl_seconds)
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

-- Records the outcome of a sync attempt this caller already won the claim
-- for (see claim_sync_slot). Best-effort from sync.ts's side — a failure
-- to record the outcome should never fail the request that already has
-- its data. `last_succeeded_at` is only touched on a real success (a
-- failed attempt doesn't erase the last time this key *did* work), and
-- `last_error` is cleared on success so a stale error message never
-- lingers after a later successful sync.
create or replace function public.record_sync_result(p_key text, p_ok boolean, p_error text)
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
