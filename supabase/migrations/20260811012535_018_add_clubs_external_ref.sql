-- 018: add clubs.external_ref (Phase 7B — proper opponent club
-- representation). Mirrors the matches.external_ref / players.external_ref
-- pattern already established: maps an API-Football numeric team id to a
-- local clubs.id, so opponent clubs discovered via fixture/event sync can
-- be resolved and reused idempotently instead of every player being
-- mis-attributed to Manchester United (the only club that previously
-- existed).
--
-- Nullable: a club created before this column existed, or one added by an
-- admin with no provider mapping, legitimately has no external_ref.
-- Unique when set, so a provider team id always resolves to exactly one
-- clubs.id.
--
-- Verified live before applying: public.clubs contains exactly one row
-- (Manchester United), so no pre-existing value can conflict with the new
-- uniqueness constraint.
alter table public.clubs
  add column external_ref text;

alter table public.clubs
  add constraint clubs_external_ref_key unique (external_ref);

comment on column public.clubs.external_ref is
  'API-Football numeric team id (as text) — e.g. 33 for Manchester United. Nullable; unique when set. Used to resolve a provider team id to clubs.id during Match Centre sync.';

-- Associate the existing, pre-seeded Manchester United row with its
-- verified API-Football team id (confirmed live via GET /teams?search=
-- Manchester United during Phase 7 verification: id 33). This is a data
-- update on the existing row only — it is not deleted or recreated.
update public.clubs
  set external_ref = '33'
  where slug = 'manchester-united';
