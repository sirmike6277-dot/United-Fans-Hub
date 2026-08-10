# United Fans Hub — Database Implementation Log

Companion to `database-architecture-proposal.md` (the design source of truth) and `database-architecture-proposal.md#W` (deviations summary). This log records what was actually built, migration by migration, against the live Supabase project (`united-fans-hub`, `bprrrycjqpqiegkakjsm`). Each migration was applied individually and fully verified (RLS, grants, FKs, uniques, indexes, advisors, and behavioral tests where the logic was non-trivial) before the next one was written, per the implementation rules that governed this phase.

No UI was built in this phase. No `pg_cron`. No service-role credentials introduced into the application. All changes are additive; nothing existing was dropped, reset, or disabled.

**Note added post-implementation:** a subsequent pre-UI audit (`pre-ui-audit-2026-08-10.md`) found two critical RLS defects that the verification passes below did not catch (`profiles.fan_points`/`fan_level` directly writable by the owner; `conversation_participants.role` self-escalatable to `admin`), plus several smaller schema/proposal discrepancies. This log is left as-written below — see the audit document for what was found afterward and why the original verification missed it.

---

## 001 — `roles_scaffold`

**Tables:** `roles` (`id`, `key unique`, `name`, `description`), `user_roles` (`profile_id`, `role_id`, `granted_by`, `granted_at`; PK `(profile_id, role_id)`).

**Function:** `public.has_role(role_key text)` — `SECURITY DEFINER`, `search_path=public`, checks whether `auth.uid()` holds the named role via `user_roles`/`roles`. Granted to `anon`/`authenticated` (always safe: evaluates against `auth.uid()`, never an arbitrary profile).

**Seed data:** 5 roles — `super_admin`, `moderator`, `content_manager`, `match_manager`, `award_manager`.

**RLS:** both tables RLS-enabled. `user_roles` has no policies at all (deny-all to every client role) — role grants are managed outside client access entirely; flagged by the advisor as `rls_enabled_no_policy` (INFO, accepted baseline, re-confirmed at every later advisor run in this project).

**Security notes:** `has_role()` is the single gate used by every "admin-gated" policy in every later migration.

---

## 002 — `clubs_seam`

**Table:** `clubs` (`id`, `name`, `short_name`, `slug unique`, `crest_url`, `created_at`). RLS enabled, public-readable, admin-write (`super_admin`).

**Seed data:** exactly one row — Manchester United. No other clubs created, per instruction.

**Purpose:** future-proofing seam for `club_id` FKs on club-scoped entities (matches, players, awards) without building any multi-club UI or logic now.

---

## 003 — `social_links_and_profile_extensions`

**Table:** `social_links` (`id`, `profile_id FK cascade`, `platform`, `url`, `created_at`). Owner-write-only RLS, public-readable.

**Profile columns added (additive):** `matchday_routine`, `fan_style`, `favourite_chant` — all nullable text.

**Deviation:** `favourite_player_id` (also scheduled here by the migration order) was deferred to migration 008, since its FK target (`players`) doesn't exist yet. See proposal §W.1.

---

## 004 — `community_content`

**Tables:** `posts`, `post_media`, `comments`, `post_reactions`, `comment_reactions`, `mentions`, `follows`.

**Design carried over exactly as proposed:** soft-delete (`deleted_at`) on `posts`/`comments`, moderation `status` (`published`/`hidden`/`removed`) distinct from the soft-delete, polymorphic `mentions` (nullable `post_id`/`comment_id`, exactly one set).

**RLS:** owner-write-only for posts/comments/reactions; public-readable content gated by `status = 'published'`; `follows` publicly readable, insert/delete as self.

---

## 005 — `messaging`

**Tables:** `conversations` (`kind`: `dm`/`group_dm`/`community_room`/`regional_room`), `conversation_participants` (PK `(conversation_id, profile_id)`, `role` member/admin), `community_rooms` (satellite for room-kind conversations), `messages`, `message_media`.

**RLS (as originally written):** participant-scoped reads/writes on `conversations`/`messages`/`message_media`, keyed through `conversation_participants`. Community-room creation gated to `moderator`.

**Defect found later, fixed in a corrective migration (see below):** the original `conversation_participants` SELECT policy ("Participants can see co-participants") and part of its INSERT policy self-referenced `conversation_participants` from within its own RLS expression. This is a known Postgres RLS limitation, not something advisors flag — it only surfaces at query time as `42P17: infinite recursion detected in policy`. It was not caught during this migration's original verification pass and went unnoticed until a live behavioral test during the storage-bucket phase happened to query the table directly.

---

## `005_fix_conversation_participants_recursion` (corrective, applied during the storage phase)

**Root cause:** see above — a same-table self-join inside `conversation_participants`'s own RLS policy. This transitively broke every table whose policies subquery `conversation_participants` (`conversations`, `messages`, `message_media`), and would have broken the new message-media/voice-message storage policies too. Effectively, the entire messaging system was unusable for any authenticated client.

**Fix:** the standard Supabase-recommended pattern — two `SECURITY DEFINER` helper functions:
- `public.is_conversation_participant(p_conversation_id uuid)`
- `public.is_conversation_admin(p_conversation_id uuid)`

Both are owned by `postgres` (which bypasses RLS on `conversation_participants` via ownership, since `relforcerowsecurity` is `false` throughout this schema — same as every other table), and both check only `auth.uid()` internally — there is no parameter to check an arbitrary other profile, so direct RPC calls can't be used to enumerate other users' conversation membership. `search_path` explicitly set to `public, pg_temp`.

The two broken `conversation_participants` policies were dropped and recreated to call these functions instead of self-joining. Granted `EXECUTE` to `authenticated` and (after confirming the functions always return `false` for an unauthenticated caller, since `auth.uid()` is null) to `anon` as well, so RLS denials resolve to a clean empty result rather than a `42501` permission error — matching the rest of the schema's fail-closed-with-empty-results posture.

**Verified after the fix:**
- `select count(*) from conversation_participants` as the real test profile: previously `42P17`, now returns `1` (its own row).
- `conversations`/`messages` counts as the same profile: both now return correctly (`1`/`0`) instead of erroring.
- A genuine participant can insert into and select from `message-media` storage objects for their conversation; a different, unrelated authenticated profile sees `0` rows for that same object.
- `anon` sees `0` rows for private buckets (clean empty result after the grant fix, not a permission error); `anon` cannot insert into the public `post-media` bucket either.

All test data (a temporary self-DM conversation, its participant row, and one fake storage object) was created and removed within the same verification pass.

---

## 006 — `notifications` (+ corrective grant fix)

**Table:** `notifications` (`recipient_id`, `actor_id` nullable/`SET NULL`, `type` — fixed check list including `moderation_action` for future use, `subject_type`/`subject_id` polymorphic, `read_at`, `created_at`). Indexes: `(recipient_id, created_at desc)`, partial index on unread.

**Functions (6 triggers):** `notify_on_follow`, `notify_on_comment`, `notify_on_post_reaction`, `notify_on_comment_reaction`, `notify_on_mention`, `notify_on_message` — all `SECURITY DEFINER`, insert a notification row when the corresponding content is created.

**Defect found and fixed in this same migration group:** `revoke all on function ... from public` does **not** strip Supabase's default per-function grants to `anon`/`authenticated` on newly created functions in the `public` schema — confirmed via `information_schema.routine_privileges` and via the advisor surfacing new WARNs ("Public Can Execute SECURITY DEFINER Function") for all 6 functions. **Fix (`006_fix_notify_function_grants`):** explicit `revoke execute on function ... from public, anon, authenticated` for each. Re-verified clean. This lesson was carried forward proactively into every subsequent function-creating migration (007, 010) and was still caught fresh once more in 010 (see below) — the `revoke ... from public` alone is not sufficient, every time, and must explicitly name `anon`/`authenticated`.

---

## 007 — `gamification_ledger`

**Tables:** `point_events` (append-only ledger, system-only — no client write grant), `fan_levels` (seeded level 1 only), `engagement_snapshots`, `badges`, `user_badges`.

**Functions:** `sync_fan_points()` and `sync_fan_level()` — triggers that keep `profiles.fan_points` (cache) and `profiles.fan_level` (FK to `fan_levels`, added in this migration) in sync with `point_events`. Grants correctly restricted from the start (`revoke ... from public, anon, authenticated` applied proactively, no repeat of the 006 bug).

**Deviation:** no triggers were added anywhere in the schema to actually insert into `point_events` for community actions — no point values were specified in the proposal, so none were invented. The ledger and its sync machinery work end-to-end; nothing populates it yet.

---

## 008 — `match_prediction`

**Tables:** `players`, `matches`, `match_events`, `predictions` (flattened model — explicit columns per predictable field, not a normalized answers sub-table), `prediction_scores` (system-only), `scoring_rules`.

**Profile column resolved:** `profiles.favourite_player_id` FK added here (deferred from 003).

**Deviations:** predictions are strictly owner-private, even post-match (see proposal §W.4); match locking compares `now()` to `matches.kickoff_at` directly in the RLS predicate rather than via a cron-populated `locked_at` field (§W.5); `scoring_rules` management gated to `super_admin` (§W.6).

---

## 009 — `awards_voting`

**Tables:** `award_categories`, `award_periods`, `award_nominations`, `award_votes`, `award_winners` (system-only).

**DB-level enforcement (not left to the frontend):** `UNIQUE(period_id, voter_profile_id)` on `award_votes` (one vote per member per period); RLS predicate blocks self-voting and requires the period's voting window to be open.

**Behavioral test performed:** simulated the real test profile (as an authenticated session, via `set local role authenticated` + `request.jwt.claims`) attempting to vote for its own nomination — genuinely rejected with `42501: new row violates row-level security policy`, confirming the self-vote block is enforced by Postgres, not application code.

**Known test coverage limitation:** the voting-window-closed predicate could not be behaviorally isolated without a second real, distinct profile as the nominee (a second real `auth.users` row was not fabricated, per the safety rule against modifying `auth.users`). Verified by code review only, not by a live test.

All temporary test data (one test category/period/nomination) was created and removed in dependency order (`award_nominations` → `award_periods` → `award_categories`) after testing.

---

## 010 — `moderation` (+ corrective grant fix + corrective index)

**Tables:**
- `reports` — member-filed, `reporter_id`/`resolved_by` deliberately `NO ACTION`/`SET NULL` (not `CASCADE`) so a report survives the reporter's account deletion, matching the audit-trail precedent already set by `messages.sender_id`/`conversations.created_by`.
- `moderation_actions` — **system-only**, per proposal §D: no INSERT/UPDATE/DELETE policy for any client role at all (RLS-enabled with a SELECT-only policy for staff). The only write path is the function below.
- `user_blocks` / `user_mutes` — symmetric shape, `CASCADE` both sides (bilateral relationship, like `follows`), `CHECK` preventing self-block/self-mute.

**Function:** `public.record_moderation_action(target_type, target_id, action_type, reason, report_id?, expires_at?)` — `SECURITY DEFINER`, checks `has_role('moderator')`/`has_role('super_admin')` before inserting; raises an exception otherwise. See proposal §W.2 for what it deliberately does not do.

**Defect found and fixed in this same migration group (same class as 006):** `revoke all on function record_moderation_action(...) from public` again left `anon` with an explicit EXECUTE grant (confirmed via `information_schema.routine_privileges`). **Fix (`010_fix_record_moderation_action_grants`):** explicit `revoke ... from public, anon`, re-grant to `authenticated` only. Re-verified: only `authenticated`/`postgres`/`service_role` remain.

**Performance advisor finding, fixed (`010_fix_reports_resolved_by_index`):** `reports.resolved_by` (nullable FK) had no covering index; added `reports_resolved_by_idx`.

**Behavioral tests performed (all passing):**
- Direct `INSERT` into `moderation_actions` by an authenticated non-moderator → blocked by RLS (`42501`).
- `record_moderation_action()` called by an authenticated non-moderator → blocked by the function's own role check (`insufficient privileges to record a moderation action`).
- `record_moderation_action()` called by a real moderator (temporarily granted the role for this test, then revoked) → succeeds, row visible to moderators via SELECT.
- `UPDATE`/attempted tamper on an existing `moderation_actions` row by a moderator → silently affects 0 rows (no UPDATE policy exists for any role — the audit log is immutable even to staff).
- A report's own filer (non-moderator) attempting to update its `status` → 0 rows affected; a different, unrelated non-moderator profile → sees 0 rows for someone else's report (self-only visibility holds).
- Self-block insert (`blocker_id = blocked_id`) → rejected by the `CHECK` constraint (`23514`), not left to frontend validation.

**Known test coverage limitation:** full bilateral block/mute behavior (blocking a second real, distinct user, confirming the blocked party can't see who blocked them) could not be live-tested without fabricating a second `auth.users` row, which was not done. The self-referential check and the blocker-only visibility policy were verified individually instead.

All temporary test data and the temporary moderator role grant were removed after testing.

---

## `011_storage_buckets`

**Buckets created:** `post-media` (public), `message-media` (private), `voice-messages` (private). No size/MIME limits set, matching the existing `avatars`/`covers` buckets (Phase 4).

**Path conventions:**
- `post-media`: `{author_id}/{filename}` — same convention as `avatars`/`covers`.
- `message-media` / `voice-messages`: `{conversation_id}/{uploader_id}/{filename}` — the `conversation_id` segment drives read access for **all participants** (not just the uploader, per the proposal's explicit "participant-scoped, not uploader-scoped" requirement); the `uploader_id` segment scopes who can update/delete their own upload.

**RLS:** `post-media` is public-readable, owner-write (matches public-readable-content posture); `message-media`/`voice-messages` reads are gated through `public.is_conversation_participant()` (the same helper introduced in the `005` bug fix above — these storage policies were written to use it directly rather than a raw join, to avoid ever depending on `conversation_participants`'s own RLS).

**Behavioral tests performed:**
- A genuine conversation participant can insert a `message-media` object under their own conversation/uploader path, and can then see it.
- A different, unrelated authenticated profile sees `0` rows for that same object.
- `anon` sees `0` rows for both private buckets, and is rejected inserting into the public `post-media` bucket.

All test objects, the temporary test conversation, and its participant row were removed after testing (the direct-delete-from-`storage.objects` protection trigger required `set local storage.allow_delete_query = 'true'` for the one cleanup statement, per Storage's own safeguard against orphaned-object data loss).

---

## Post-implementation validation summary

- **Schema:** 100% RLS coverage confirmed across all 37 public-schema tables (`relrowsecurity = true` on every one, zero exceptions).
- **Data integrity:** `profiles` = 1, `auth.users` = 1 (the real test account, untouched throughout), all award/report/moderation/messaging/storage test data fully cleaned up — every table that had temporary test rows verified back to `0`.
- **Application compatibility:** ran the existing Playwright login → session-cookie-present → refresh-persists → logout → post-logout-`/profile`-redirects-to-`/login` flow against the live dev server using the real test account. All steps passed, zero console errors. Confirmed visually that `/profile` renders correctly with the new gamification fields (`LEVEL 1`, `0 PTS`) sourced from migration 007's `fan_levels` join — no regression from any of the ten migrations plus storage.
- **Types:** `src/lib/supabase/database.types.ts` regenerated from the live schema; `npx tsc --noEmit` passes with zero errors against the existing application code.
