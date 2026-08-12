-- 017: add a unique constraint on players.external_ref (Phase 7A defect
-- fix). The sync process (src/lib/matches/sync.ts) has always looked up
-- players by external_ref alone, globally, ignoring club_id — meaning it
-- already treats external_ref as a globally-unique provider identity;
-- this constraint just makes the database enforce what the application
-- logic already assumed. NULLs remain unrestricted (a plain UNIQUE
-- constraint allows multiple NULLs), since external_ref stays nullable
-- for any future manually-added player with no provider mapping.
--
-- Verified live before applying: public.players contained 0 rows (prior
-- historical-verification test data had already been fully cleaned up),
-- so no duplicate external_ref values existed to block this constraint.
alter table public.players
  add constraint players_external_ref_key unique (external_ref);
