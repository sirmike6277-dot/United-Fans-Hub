-- Distinguishes a player row created/kept current by squad sync (real,
-- currently-rostered Man Utd squad member) from a player row that only
-- exists because they appeared in a historical match_event (e.g. a scorer
-- who has since left the club). Both kinds legitimately share club_id =
-- Man Utd's club row and must keep doing so unchanged, for existing Match
-- Centre event-display/attribution correctness (see sync.ts's
-- resolvePlayerId) — this column is purely an additional signal for
-- Predictions' "current squad only" eligibility, not a replacement for
-- club_id, and never affects any existing Match Centre behavior.
alter table public.players
  add column if not exists squad_synced_at timestamptz null;

comment on column public.players.squad_synced_at is
  'Set by syncSquad() to now() whenever this row is confirmed present in the most recent API-Football squad fetch; cleared back to null the moment they are absent from a later fetch. Null for any player row that only exists via historical match_events resolution. Used to scope Predictions eligible-player pools to the current squad only — never used for club_id/attribution, which remains permanent regardless of current squad status.';
