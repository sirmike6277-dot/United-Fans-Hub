# Pre-UI Audit — 2026-08-10

A full adversarial audit of the repository and the live Supabase implementation (`united-fans-hub`, `bprrrycjqpqiegkakjsm`), run after all 16 database-architecture migrations were complete and before any UI work begins. This document is additive to `database-architecture-proposal.md` and `database-implementation-log.md` — it does not rewrite either; it records what a *subsequent* audit pass found, including two defects that the original migration-by-migration verification did not catch.

**Final verdict: NOT READY FOR UI.** Two critical, confirmed, live-exploitable vulnerabilities must be fixed first. See §12.

**Update — hardening pass completed same day.** Both critical findings in §12, plus the `posts`/`comments`/`messages` follow-up review requested alongside them, were fixed in migrations `012_secure_profiles_gamification_columns` (+ its `_fix` corrective), `013_fix_conversation_participant_role_escalation`, and `014_harden_content_ownership_immutability`. The original findings text below is left exactly as written (per the same "don't rewrite history" principle this document itself established) — see the security hardening report delivered alongside this update for full details, fix rationale, and the new verdict.

---

## 1. Git / change review

`git status` shows nothing unexpected: all staged files predate this database phase (landing page, auth UI, Phase-4 Supabase wiring); the only files touched during the DB architecture phase are `database-architecture-proposal.md`, `database-implementation-log.md`, and `database.types.ts` (regenerated, byte-identical to a fresh pull). No secrets in tracked/untracked files (one string match on "service_role" in the implementation log is prose referencing the Postgres role name, not a credential). No debug/test scripts leaked into the repo — all Playwright scripts and screenshots lived only in the isolated scratchpad, never in the project tree. No unnecessary dependencies were added (`package.json` unchanged from Phase 4).

**Finding (informational, not a defect):** there is no `supabase/migrations/` directory or any local `.sql` files — all 16 migrations exist only in Supabase's remote history (`supabase_migrations.schema_migrations`), applied via the MCP `apply_migration` tool. The full SQL text of every migration is recoverable from that table's `statements` column, so nothing is actually lost, but the repo itself cannot currently reproduce the database from local files, and there's nothing for a PR/code review to look at. **Recommendation: FIX NOW** (low-risk) — export each migration's SQL from `supabase_migrations.schema_migrations` into `supabase/migrations/<version>_<name>.sql` for version control. Not done in this audit; flagged for approval first, per instructions not to silently reconcile.

## 2. Migration audit

All 16 migrations (`001`–`011` plus five corrective migrations: `006_fix_notify_function_grants`, `010_fix_record_moderation_action_grants`, `010_fix_reports_resolved_by_index`, `005_fix_conversation_participants_recursion`, `005_fix_conversation_helpers_anon_grant`) were pulled directly from Supabase's migration history and scanned for `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `ALTER TABLE auth.*`, unexpected `DELETE FROM`, and `DROP FUNCTION` — **zero destructive statements found** anywhere. The only `DROP POLICY` statements in the entire history are in `005_fix_conversation_participants_recursion`, and each is immediately paired with an equivalent-or-stronger `CREATE POLICY` replacement (verified by reading the full statement text).

No migration depends on a manually-performed dashboard change beyond Supabase's own default project bootstrap (`pgcrypto`, `uuid-ossp`, `plpgsql` — enabled by default on every new Supabase project, not something toggled by hand). `pg_cron` is confirmed **not** installed, matching the explicit instruction.

Migration numbering: names are semantic (which original migration a fix targets), not chronological — e.g. `005_fix_conversation_participants_recursion` was applied *after* `011_storage_buckets` chronologically (it was found while testing storage), which is correctly reflected in the migration's own header comment and the implementation log, but could look confusing if someone assumes name-prefix order equals apply order. **Classification: minor documentation clarity note, not a defect.**

## 3. Database schema audit vs. proposal

Full column/type/PK/FK/unique/check/index cross-check performed against every relevant section of `database-architecture-proposal.md`. All 17 unique constraints in §G's summary are present and exact. All FK delete rules follow the established "owner column cascades, secondary-actor reference doesn't" pattern consistently. `mentions`' exactly-one-of check, `match_events.match_id` cascade, `community_rooms` shape, `messages`/`message_media` shape — all match exactly.

**Discrepancies found (not silently reconciled):**

1. **`predictions.locked_at` is a dead column.** The proposal specifies it as the enforcement mechanism ("set = kickoff time; enforced via check/trigger"). The live implementation never populates it — no trigger touches it — and instead enforces the lock via a direct `now() < matches.kickoff_at` comparison in the RLS predicate. This was already disclosed as a deliberate deviation in proposal §W.5; this audit re-confirms it's still true and the column is still inert. **Classification: BY DESIGN/ACCEPTED** (functionally sound, avoids a `pg_cron` dependency), but the dead column is a minor foot-gun for anyone who later assumes `locked_at IS NOT NULL` means "locked." Recommend documenting this in a code comment when prediction UI is built, or removing the column — decision deferred to the user.
2. **`profiles(fan_points DESC)` — the index explicitly recommended in proposal §H for leaderboards — does not exist.** Confirmed via direct index listing. **Classification: FIX NOW** (trivial, additive, explicitly specified, needed before the "Rankings" feature already in the nav is built).
3. **`award_votes` self-vote and voting-window enforcement is inline in the INSERT policy's `WITH CHECK`, not via "a SECURITY DEFINER helper" + "a trigger" as proposal §8 specifies.** Behaviorally re-verified working (self-vote blocked with a genuine `42501`), and arguably simpler/more atomic than the specified design (fewer moving parts = less surface for a recursion-style bug like the one found in migration 005). **Classification: BY DESIGN/ACCEPTED**, flagged as a real mechanism-level deviation from the spec rather than silently treated as equivalent.
4. **22 foreign-key columns across the schema have no covering index** (surfaced by the performance advisor, cross-checked against proposal §H's blanket rule "all FK columns not already covered get a plain index — Postgres doesn't auto-index FKs"). This rule was under-applied during migrations 004–010: only FK columns named in §H's specific bullet list got indexed; the rest didn't. Full list in §11 below. **Classification: FIX NOW.**

## 4. Security audit — adversarial RLS testing

Every scenario in the task's ANON/AUTHENTICATED/MODERATOR checklist was tested live (not just code-reviewed) using `set local role` + `set local request.jwt.claims`, with all test data created and cleaned up within the same pass. Full results:

**ANON — all passed:**
- Cannot insert into `point_events`, `prediction_scores`, `award_winners`, or `moderation_actions` (all `42501`).
- Cannot read `predictions`, `reports`, `point_events`, `moderation_actions`, `messages`, `conversations`, or `conversation_participants` (all 0 rows).
- Cannot call `record_moderation_action` (no `EXECUTE` grant at all).
- Cannot read private `message-media`/`voice-messages` storage objects, even when given the exact path string (0 rows) — path knowledge is not a substitute for authorization.
- Cannot upload into another user's `post-media` folder.

**AUTHENTICATED (non-owner, non-moderator) — mostly passed, two CRITICAL failures:**
- Cannot modify another profile's `display_name` (0 rows affected). ✅
- Cannot insert into `point_events` (self-award blocked, `42501`). ✅
- **Can directly overwrite their own `fan_points` and `fan_level` via a plain `UPDATE profiles SET fan_points = 999999, fan_level = 1 WHERE id = auth.uid()` — confirmed to succeed.** 🔴 **CRITICAL.**
- Cannot insert into `prediction_scores` or `award_winners` (`42501` on both). ✅
- Cannot resolve a report they filed themselves (0 rows on status update). ✅
- Cannot read a conversation/messages they don't participate in (0 rows), even while also holding the `moderator` role. ✅
- Cannot read private message media outside their conversations (0 rows). ✅
- **A plain room `member` can self-promote to `role = 'admin'` on their own `conversation_participants` row, escalating to room-admin privileges (able to add/remove other participants via `is_conversation_admin()`).** 🔴 **CRITICAL.**

**MODERATOR:**
- `record_moderation_action` correctly requires the role (tested both directions: blocked without it, succeeds with it, revoked cleanly afterward).
- Direct writes to `moderation_actions` remain blocked even for a moderator — the audit log is immutable to every role including staff (an `UPDATE` attempt silently affected 0 rows).
- Holding `moderator` does **not** leak into unrelated ownership scoping — a moderator still sees 0 rows for a conversation they never joined. Confirmed live.

**Root cause of both critical findings:** several "owners can update their own row" RLS policies (`profiles`, `conversation_participants`, and structurally also `posts`/`comments`/`messages`) have a `USING` clause but **no `WITH CHECK`**, and Postgres RLS is row-level, not column-level. Table-level column grants for `authenticated` are the Supabase-wide default (unrestricted) on every table, so the *only* thing that can restrict which columns an owner may change is the policy's `WITH CHECK` — and for `fan_points`/`fan_level`/`role`, none exists. The same pattern was checked on `posts.status` (could an author self-reverse a moderator's takedown?) and found to be *accidentally* non-exploitable only because `posts`' sole `SELECT` policy is `status = 'published'` — a hidden/removed post becomes entirely invisible (including to its own author), so it can't even be targeted by `UPDATE`. That is incidental protection, not a designed one, and does not apply to `profiles` or `conversation_participants` (both have permissive `SELECT` policies), where the vulnerability is live.

**SECURITY DEFINER function review** (`has_role`, `is_conversation_participant`, `is_conversation_admin`, `record_moderation_action`, `sync_fan_points`, `sync_fan_level`, all 6 `notify_on_*`): every function has an explicit `search_path` (`public`/`public, pg_temp`), every table reference is schema-qualified, every `auth.uid()` call is schema-qualified (safe regardless of `search_path` contents), no dynamic SQL anywhere, and grants are minimal and correct (`sync_fan_*`/`notify_on_*` → `postgres`/`service_role` only; `has_role`/`is_conversation_*` → `anon`+`authenticated`, safe by construction since they only ever evaluate `auth.uid()`; `record_moderation_action` → `authenticated` only, with an internal role check). `email_for_username` (pre-existing, Phase 4, not part of this database-architecture phase) still shows its known baseline WARN — out of scope for this audit, unchanged.

**Important caveat on tooling:** the Supabase security advisor's automated lints did **not** flag either critical vulnerability — it checks for missing RLS/missing policies/over-broad grants, not for a policy's `WITH CHECK` being semantically insufficient. Both were found only through manual adversarial testing, which is the whole justification for this audit step.

## 5. Gamification audit

`point_events` is confirmed as the actual source of truth: inserting two trusted point events (+5, +3) correctly incremented `profiles.fan_points` via `sync_fan_points()` (8), a negative `admin_adjustment` (-3) correctly decremented it (5), and `SUM(points) FROM point_events` exactly matched the cached `fan_points` value at every step — full auditability confirmed. `fan_level` recomputation via `sync_fan_level()` is wired correctly (only one level is currently seeded, so level progression itself couldn't be exercised, but the mechanism fired correctly on every `fan_points` change). All test events were deleted and the profile restored to its exact original `fan_points=0, fan_level=1` baseline afterward.

**This audit's dominant finding for gamification is the CRITICAL vulnerability from §4**: the ledger and its sync triggers are correct and trustworthy, but the cached columns they feed are not protected from direct client tampering, which defeats the entire point of building an event-sourced ledger in the first place. The ledger being correct does not matter if a client can bypass it entirely.

## 6. Messaging audit

Fresh end-to-end test: created a `community_room` conversation with a `community_rooms` satellite row, one participant, and one message. Confirmed **positive case** — the participant sees the conversation (1), the message (1), and the room metadata (1). Confirmed **negative case** — a different, non-participant identity sees the conversation (0) and the message (0), but *does* see the room metadata (1) — correct by design, since room listings are meant to be publicly browsable while their content stays participant-gated (per proposal §4). No `42P17` recursion error occurred anywhere in this or any other query against `conversation_participants` in this entire audit — the `005` fix holds. All test data cleaned up.

## 7. Storage audit

- `post-media`: confirmed public-read (pre-existing verification) and confirmed, freshly, that an authenticated user cannot upload into another user's folder (`42501`).
- `message-media`/`voice-messages`: confirmed private and participant-scoped with a fresh test, including the specific "path knowledge alone doesn't grant access" check — a non-participant given the *exact* object path string still gets 0 rows. Authorization is identity-based (via `is_conversation_participant()`), not obscurity-based.

## 8. Application regression

Re-ran the existing Playwright login → session-cookie-present → refresh-persists → logout → post-logout-`/profile`-redirect flow fresh: all passed, zero console errors. Additionally ran a fresh profile-edit round trip: navigated to `/profile/edit`, confirmed avatar/cover upload widgets render, edited the bio field, saved, and confirmed the new value persisted on reload — all through the real application, not raw SQL. The bio value written by this test was reset to its original `null` afterward. Signup/email-confirmation were not re-run in this session (already thoroughly verified in the prior email-verification-test phase, before any of these 16 migrations existed, and nothing in this phase touches `auth.*` or the Resend/SMTP configuration — confirmed untouched throughout). Avatar/cover file upload itself (an actual binary) was not exercised in this pass — only the widgets' presence and the surrounding form's save path were confirmed; full upload behavior was verified when originally built in Phase 4 and nothing in this phase's migrations altered the `avatars`/`covers` buckets or their policies.

## 9. Types

`database.types.ts` regenerated and diffed byte-for-byte identical to the version already in the working tree — no drift. `npx tsc --noEmit` passes with zero errors.

## 10. Documentation

This document is the record of what this audit pass found, kept separate from `database-implementation-log.md` (the record of what the *original* implementation pass did and verified) so neither document's history is rewritten. `database-architecture-proposal.md`'s §W deviations section was not modified by this audit (all deviations recorded there were re-confirmed still accurate; no new architectural deviation was introduced by this audit itself — the findings above are defects/gaps, not new design decisions).

## 11. Performance / advisor review

**Security advisors:** unchanged from the post-implementation baseline — no new findings (as expected, since this audit made no DDL changes). The one new-since-baseline entry class (`is_conversation_participant`/`is_conversation_admin` showing as anon/authenticated-executable) was already reviewed and accepted during the original `005` bug fix.

**Performance advisors**, classified:

| Finding | Count | Classification | Why |
|---|---|---|---|
| `unindexed_foreign_keys` | 22 columns (`award_nominations.nominated_by`/`nominee_profile_id`, `award_votes.voter_profile_id`, `award_winners.badge_id`/`nomination_id`, `comment_reactions.user_id`, `comments.author_id`, `conversations.club_id`/`created_by`, `match_events.player_id`, `messages.sender_id`, `notifications.actor_id`, `point_events.created_by`, `post_reactions.user_id`, `predictions.predicted_first_scorer_id`/`predicted_motm_id`, `profiles.fan_level`/`favourite_player_id`, `scoring_rules.club_id`, `user_badges.awarded_by`/`badge_id`, `user_roles.granted_by`) | **FIX NOW** | Explicitly required by proposal §H's blanket rule; low-risk, purely additive; several of these (`comments.author_id`, `messages.sender_id`, reaction `user_id` columns) will be hit immediately by the most basic feed/activity queries once UI ships. |
| `profiles(fan_points desc)` missing | 1 | **FIX NOW** | Same rationale — explicitly named in §H, needed for the Rankings feature already in the nav. |
| `multiple_permissive_policies` | 75 (mostly WARN) | **BY DESIGN/ACCEPTED** | Nearly all are the intentional "public/self-read policy + separate admin-role policy" layering used consistently per proposal §I, chosen for readability over merging into single compound predicates. Negligible per-row cost at current and expected near-term data volumes; revisit only if a specific query proves to be a bottleneck at scale. |
| `unused_index` | 26 (INFO) | **ACCEPTED/DEFER** | Every new table is currently empty with zero query history — this is expected and will resolve naturally once real traffic exists. Do not drop these; they were deliberately added per proposal §H. |
| `auth_db_connections_absolute` | 1 (INFO) | **DEFER** | Generic Supabase infra/connection-pool tuning note tied to project tier, unrelated to this schema or phase. Out of scope. |

## 12. Blocking issues (must fix before UI)

1. **CRITICAL — `profiles.fan_points`/`profiles.fan_level` are directly writable by their own owner.** A normal authenticated user can run `UPDATE profiles SET fan_points = <anything> WHERE id = auth.uid()` and it succeeds. This defeats the entire event-sourced gamification design. **Fix:** add a `WITH CHECK` (or a `BEFORE UPDATE` trigger) on the `profiles` owner-update policy that rejects any change to `fan_points`/`fan_level` from a plain `authenticated` client, or revoke column-level `UPDATE` on those two columns from `authenticated`/`anon` entirely (client should never send them; only the `sync_fan_points`/`sync_fan_level` triggers, running as `postgres`, should ever set them).
2. **CRITICAL — a plain `conversation_participants` member can self-promote to `role = 'admin'`,** escalating to room-admin privileges (can then add/remove other participants). **Fix:** restrict the "users can update their own participant row" policy's `WITH CHECK` so `role` cannot be changed by the row's own owner (only an existing admin, moderator, or the conversation's creator should be able to change anyone's `role`).

Both are confirmed, live, reproducible right now against the production schema — not theoretical. Recommend fixing both (plus, ideally, the same defensive `WITH CHECK` hardening on `posts`/`comments`/`messages` owner-update policies, since the same root-cause pattern exists there too, currently non-exploitable only by incidental luck on `posts`/`comments` and only partially protected on `messages`) before writing any UI that depends on these tables behaving as designed.
