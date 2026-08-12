-- 016: add matches.is_home (Phase 7 Match Centre) — the schema had no way
-- to represent whether the tracked club (matches.club_id, i.e. Manchester
-- United) was the home or away side; home_score/away_score alone and the
-- free-text venue column are not a reliable substitute (breaks for away
-- legs, neutral-venue cup finals, etc.). No default is set deliberately:
-- `matches` currently has zero rows, so there is no existing data to
-- preserve, and every future insert (via the Match Centre sync) must
-- explicitly decide home/away rather than silently inheriting a guessed
-- default.
alter table public.matches
  add column is_home boolean not null;

comment on column public.matches.is_home is
  'True when matches.club_id (Manchester United) is the home side for this fixture; false when away. No default — always set explicitly by the sync process, never inferred from venue text.';
