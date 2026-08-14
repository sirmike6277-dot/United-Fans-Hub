-- Settings completion + onboarding rules modal. Three new self-serve
-- `profiles` columns:
--
-- notification_preferences — per-category toggles (Community activity,
-- Messages, Matches & Predictions, Awards & Achievements) that the
-- notification read layer (src/lib/notifications/notifications.ts)
-- filters by. `moderation_action` is deliberately NOT one of the
-- categories here — it's an account-safety notice, always shown,
-- never user-suppressible.
--
-- appearance_preferences — reduced motion + text size. Deliberately not a
-- light/dark theme (this app has no theme system at all today, and a real
-- one would mean re-skinning every component — out of scope, a decision
-- made explicitly this phase, not an oversight).
--
-- onboarding_seen_at — tracks whether a member has acknowledged the
-- welcome/rules modal. Backfilled to now() for every EXISTING row below
-- specifically so the modal only ever appears for genuinely new signups
-- (rows created after this migration, which start null) — not
-- retroactively to the whole existing membership.
--
-- CRITICAL: this table's UPDATE grant is column-allowlisted, not
-- table-wide (see 012_secure_profiles_gamification_columns_fix.sql) — a
-- real bug already happened once from forgetting to extend this list on a
-- new column (043_grant_update_profiles_cover_focus_y.sql was a dedicated
-- follow-up fix for exactly that, for cover_focus_y). All three new
-- columns get their grant in this same migration, not as an afterthought.
alter table public.profiles
  add column notification_preferences jsonb not null default '{"community": true, "messages": true, "matches": true, "awards": true}'::jsonb,
  add column appearance_preferences jsonb not null default '{"reduce_motion": false, "text_size": "normal"}'::jsonb,
  add column onboarding_seen_at timestamptz;

update public.profiles set onboarding_seen_at = now() where onboarding_seen_at is null;

comment on column public.profiles.notification_preferences is
  'Per-category in-app notification visibility toggles: {community, messages, matches, awards}, each boolean. Filters what src/lib/notifications/notifications.ts surfaces in the feed/bell/unread-count — does not affect whether the underlying notifications row is created (the DB triggers that insert into notifications are unaware of this column by design; see the phase report for why "hide what you see" was chosen over "touch every trigger"). moderation_action is intentionally excluded from any category — always visible.';

comment on column public.profiles.appearance_preferences is
  'Real, working accessibility preferences: {reduce_motion, text_size}. reduce_motion (boolean) and text_size ("normal"|"large") are read client-side (src/components/layout/AppearanceEffect.tsx) and applied via data-* attributes on <html>, consumed by CSS in globals.css. Not a light/dark theme — this app has exactly one designed palette; a real theme system was explicitly out of scope this phase.';

comment on column public.profiles.onboarding_seen_at is
  'When this member acknowledged the welcome/community-rules modal (src/components/onboarding/WelcomeRulesModal.tsx). Null means never seen — only true for rows created after this migration (every pre-existing row was backfilled to now() above), so the modal is new-signup-only, never retroactive.';

grant update (notification_preferences, appearance_preferences, onboarding_seen_at)
  on public.profiles to authenticated, anon;
