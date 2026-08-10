# United Fans Hub — Database & Domain Architecture Proposal

**Status: PROPOSAL ONLY. Nothing in this document has been created. No migrations, tables, or code changes have been made.**

Companion to `2026-08-09-web-first-plan.md`. This extends the original schema sketch with the full profile/community/gamification/prediction/moderation/admin model requested, grounded in what's actually live today (checked directly, not assumed).

---

## A. Current database/auth state

Verified directly against the live project (`united-fans-hub`, `bprrrycjqpqiegkakjsm`) before writing anything below:

- **`public.profiles`** — the only application table that exists. 1 row (the confirmed test account). Columns: `id uuid PK/FK→auth.users.id`, `username text unique, 3-24 chars, [a-zA-Z0-9_]`, `display_name`, `avatar_url`, `cover_url`, `bio`, `location`, `country`, `favourite_player`, `favourite_era`, `fan_since_year smallint`, `favourite_shirt`, `favourite_memory`, `fan_level int default 1`, `fan_points int default 0`, `created_at`, `updated_at`. RLS enabled: public read, owner-only insert/update (optimized with `(select auth.uid())`).
- **`public.email_for_username(text)`** — SECURITY DEFINER RPC, deliberately grants `EXECUTE` to `anon`/`authenticated` (documented, accepted advisor warning).
- **`public.handle_new_user()`** — trigger on `auth.users` insert, auto-provisions the profile row; EXECUTE revoked from `anon`/`authenticated` (trigger-only).
- **Storage buckets**: `avatars` (public), `covers` (public) — RLS restricts write to `{auth.uid()}/...` path prefix.
- **Auth**: email/password live, custom SMTP via Resend configured and verified end-to-end. Google/Apple OAuth code path exists (`signInWithOAuth`, `/auth/callback` route) but providers aren't enabled yet.
- **Extensions installed**: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`. **Not installed**: `pg_cron` — will be needed later for scheduled jobs (engagement snapshots, prediction-deadline locking); flagged, not enabled now.
- **Current advisor state**: 2 accepted/documented warnings (`email_for_username` exposure, by design) + 1 new informational one (`auth_leaked_password_protection` disabled — a global Auth setting, unrelated to this work, noted for later).
- **Client architecture**: `src/lib/supabase/{client,server}.ts` (typed via `database.types.ts`), `src/proxy.ts` for session refresh + route protection. All reusable as-is — this proposal adds tables, not architecture changes to the client layer.

---

## B. Proposed entity model (grouped by domain)

1. **Identity** — `profiles` (extended), `social_links`
2. **Multi-club seam** — `clubs` (already decided, not yet built)
3. **Community content** — `posts`, `post_media`, `comments`, `post_reactions`, `comment_reactions`, `mentions`, `follows`
4. **Messaging** — `conversations`, `conversation_participants`, `messages`, `message_media`, `community_rooms`
5. **Notifications** — `notifications`
6. **Gamification** — `point_events` (ledger), `fan_levels` (lookup), `engagement_snapshots`, `badges`, `user_badges`
7. **Match/prediction** — `players`, `matches`, `match_events`, `predictions`, `prediction_scores`, `scoring_rules`
8. **Awards/voting** — `award_categories`, `award_periods`, `award_nominations`, `award_votes`, `award_winners`
9. **Moderation** — `reports`, `moderation_actions`, `user_blocks`, `user_mutes`
10. **Admin/roles** — `roles`, `user_roles`

---

## C–F. Proposed tables, relationships, key columns, keys

### 1. Identity

**`social_links`**
- `id uuid PK default gen_random_uuid()`
- `profile_id uuid FK→profiles.id, not null, on delete cascade`
- `platform text` — check constraint against a fixed list (`instagram`, `x_twitter`, `tiktok`, `youtube`, `facebook`, `other`) rather than a Postgres enum type, so adding a platform later is a data change, not a type migration
- `handle_or_url text not null`
- `created_at timestamptz default now()`
- **Unique**: `(profile_id, platform)` — one link per platform per user (an `other` row can still only be added once; acceptable v1 simplification)
- **Index**: `profile_id`

`profiles` itself gets no *new* columns for the items already covered (favourite player/era/shirt/memory, fan_since_year already exist). Two additive, nullable columns proposed for later, not now: `favourite_player_id uuid FK→players.id` (once `players` exists, so "favourite player" can eventually resolve to a real player record instead of free text) and `matchday_routine text` / `fan_style text` / `favourite_chant text` — small, nullable, fixed-field additions, same reasoning as the existing fan-identity columns (fixed known set → typed columns, not EAV).

### 2. Multi-club seam

**`clubs`** (as previously proposed, still not built) — `id`, `name`, `slug`, `emblem_asset_ref`, `is_active`. One row for Manchester United. Every club-scoped table below carries `club_id uuid FK→clubs.id`.

### 3. Community content

**`posts`**
- `id uuid PK`, `author_id uuid FK→profiles.id not null`, `club_id uuid FK→clubs.id not null`
- `body text`, `visibility text default 'public'` (check: `public`/`followers`) — kept minimal for v1
- `status text default 'published'` (check: `published`/`hidden`/`removed`) — moderation soft-state
- `created_at`, `updated_at`, `deleted_at timestamptz null` — **soft delete**: never hard-delete user content; `deleted_at` set instead so moderation history and references (comments, reactions) don't orphan
- **Index**: `(club_id, created_at desc)` for feed queries; `author_id`

**`post_media`** — `id`, `post_id FK→posts.id on delete cascade`, `media_type text` (check: `image`/`video`/`file`), `storage_path text not null`, `order_index int default 0`, `created_at`. Index: `post_id`.

**`comments`** — `id`, `post_id FK→posts.id on delete cascade`, `author_id FK→profiles.id`, `parent_comment_id uuid FK→comments.id null` (self-referencing, enables replies), `body text not null`, `status text default 'published'`, `created_at`, `updated_at`, `deleted_at null`. Index: `(post_id, created_at)`, `parent_comment_id`.

**`post_reactions`** / **`comment_reactions`** — kept as two tables (not one polymorphic table) for real FK integrity, per the original architecture decision. Each: `id`, `{post_id|comment_id} FK on delete cascade`, `user_id FK→profiles.id`, `reaction_type text default 'like'` (check against a small fixed list), `created_at`. **Unique**: `(post_id, user_id)` / `(comment_id, user_id)` — one reaction per user per item, enforced at the DB level, not just in application code.

**`mentions`** — `id`, `post_id FK null`, `comment_id FK null` (exactly one of the two set — check constraint), `mentioned_profile_id FK→profiles.id`, `created_at`. Feeds the `mention` notification type.

**`follows`** — `follower_id FK→profiles.id`, `following_id FK→profiles.id`, `created_at`. **PK**: `(follower_id, following_id)`. **Check**: `follower_id <> following_id`. Index on `following_id` (for "who follows me" / follower-count queries).

### 4. Messaging (unified DM + community-room infrastructure — see §N for why)

**`conversations`** — `id`, `kind text` (check: `dm`/`group_dm`/`community_room`/`regional_room`), `club_id FK null` (set for room kinds), `created_by FK→profiles.id`, `created_at`.

**`conversation_participants`** — `conversation_id FK on delete cascade`, `profile_id FK→profiles.id`, `role text default 'member'` (check: `member`/`admin` — room moderators), `joined_at`, `last_read_at`. **PK**: `(conversation_id, profile_id)`.

**`community_rooms`** — public-identity satellite table for room-kind conversations only: `conversation_id FK→conversations.id unique`, `slug text unique`, `name`, `description`, `is_regional bool default false`, `region text null`. Keeps DMs lightweight while letting rooms be listed/browsed by slug.

**`messages`** — `id`, `conversation_id FK on delete cascade`, `sender_id FK→profiles.id`, `body text null` (nullable — a message can be pure media), `created_at`, `edited_at null`, `deleted_at null` (soft delete = "unsend"). Index: `(conversation_id, created_at)`.

**`message_media`** — `id`, `message_id FK on delete cascade`, `media_type text` (check: `image`/`video`/`file`/`voice` — voice messages fold in here rather than a separate table), `storage_path`, `duration_seconds int null` (for voice/video), `created_at`.

### 5. Notifications

**`notifications`** — `id`, `recipient_id FK→profiles.id not null`, `actor_id FK→profiles.id null`, `type text not null` (check against a fixed list: `like`, `comment`, `mention`, `reply`, `message`, `follow`, `prediction_reminder`, `match_reminder`, `match_event`, `award_nomination`, `voting_open`, `achievement_unlocked`, `moderation_action`), `subject_type text null`, `subject_id uuid null` (**polymorphic** — deliberate, see §V), `read_at timestamptz null`, `created_at`. Index: `(recipient_id, created_at desc)`, partial index on `(recipient_id) where read_at is null` for fast "unread count."

### 6. Gamification (event-sourced, per explicit instruction — no mutable score field as source of truth)

**`point_events`** (the ledger — **immutable, append-only**)
- `id`, `profile_id FK→profiles.id`, `event_type text not null` (check against fixed list: `post_created`, `comment_created`, `reaction_received`, `prediction_result_correct`, `prediction_score_correct`, `prediction_scorer_correct`, `prediction_ht_correct`, `prediction_motm_correct`, `badge_awarded`, `award_won`, `admin_adjustment`)
- `points int not null` (signed — admin corrections can be negative)
- `source_type text null`, `source_id uuid null` (polymorphic pointer to the originating post/comment/prediction/etc.)
- `created_by uuid FK→profiles.id null` (set only for `admin_adjustment`, for auditability — who awarded/deducted manually)
- `metadata jsonb null`
- `created_at timestamptz default now()`
- Index: `(profile_id, created_at)`
- **RLS**: select own rows only; **no insert/update/delete grant to `anon`/`authenticated` at all** — every row is written by a trusted SECURITY DEFINER function/trigger, never directly by a client. This is the core answer to "don't let users manipulate scores or award themselves points."

`profiles.fan_points` remains as a **cached counter**, kept in sync by a trigger on `point_events` insert (`fan_points := fan_points + NEW.points`). It's a read-optimization, not the source of truth — always recomputable from the ledger (`select sum(points) from point_events where profile_id = ...`) if it ever drifts.

**`fan_levels`** (admin-configurable lookup, not hardcoded thresholds in code) — `level int PK`, `min_points int not null unique`, `title text`. `profiles.fan_level` recomputed via trigger whenever `fan_points` changes (`select max(level) from fan_levels where min_points <= NEW.fan_points`).

**`engagement_snapshots`** — periodic, not live: `id`, `profile_id FK`, `period_start date`, `period_end date`, `score numeric`, `computed_at timestamptz`. **Unique**: `(profile_id, period_start, period_end)`. This is what "Fan of the Month/Season" actually query against — a historical record of who led engagement *during a specific past period*, not just current live standing. Computed by a scheduled job (needs `pg_cron`, not installed yet — flagged in §V), not a mutable running total.

**`badges`** — `id`, `key text unique`, `name`, `description`, `icon_asset_ref`, `criteria jsonb` (machine-readable, e.g. `{"type":"points_threshold","value":1000}` or `{"type":"manual"}`) — admin-defined catalog.

**`user_badges`** — `id`, `profile_id FK`, `badge_id FK`, `awarded_at`, `awarded_by FK null`, `source_type/source_id null`. **Unique**: `(profile_id, badge_id)`.

### 7. Match/prediction (seam for a future external data provider — nothing hardcoded to one API)

**`players`** — `id`, `club_id FK`, `full_name`, `position text null`, `shirt_number int null`, `external_ref text null` (future provider's player ID — sync key), `photo_asset_ref text null` (licensed asset, never user-uploaded).

**`matches`** — `id`, `club_id FK`, `opponent_name text`, `competition text`, `kickoff_at timestamptz`, `venue text`, `status text default 'scheduled'` (check: `scheduled`/`live`/`finished`/`postponed`/`cancelled`), `home_score int null`, `away_score int null`, `external_ref text null unique` (the sync key for a future provider import job — nothing here assumes which provider). Index: `(club_id, kickoff_at)`.

**`match_events`** — `id`, `match_id FK on delete cascade`, `minute int`, `event_type text` (check: `goal`/`yellow_card`/`red_card`/`substitution`/`var`), `player_id FK→players.id null`, `detail jsonb null`. Index: `match_id`.

**`predictions`** — flattened per-match slip (simpler than the earlier `predictions`+`prediction_answers` split, since the question set is fixed and known — same "typed columns, not EAV" reasoning applied consistently):
- `id`, `profile_id FK`, `match_id FK`
- `predicted_home_score int null`, `predicted_away_score int null`
- `predicted_ht_home int null`, `predicted_ht_away int null`
- `predicted_first_scorer_id FK→players.id null`
- `predicted_motm_id FK→players.id null`
- `submitted_at timestamptz default now()`, `locked_at timestamptz null` (set = kickoff time; enforced via check/trigger that submissions/edits after `locked_at` are rejected)
- **Unique**: `(profile_id, match_id)` — one slip per user per match

**`prediction_scores`** — `id`, `prediction_id FK unique`, `points_awarded int`, `breakdown jsonb` (e.g. `{"result":3,"score":5}`), `scored_at`, `scored_by text default 'system'`. Written only by a settlement Edge Function after full-time, never client-writable (same "no self-scoring" RLS posture as `point_events`). On write, also inserts the corresponding `point_events` row.

**`scoring_rules`** — `id`, `club_id FK null` (null = global default), `rule_key text` (check: `correct_result`/`correct_score`/`correct_first_scorer`/`correct_ht_score`/`correct_motm`), `points_value int`, `active_from timestamptz`, `active_to timestamptz null`. Settlement always uses the rule active at `match.kickoff_at`, so changing point values later never rewrites history.

### 8. Awards/voting

**`award_categories`** — `id`, `key text unique` (`fan_of_month`, `fan_of_season`, `best_predictor`, ...), `name`, `description`. Lookup table, not a hardcoded enum — new award types don't need a migration.

**`award_periods`** — `id`, `category_id FK`, `period_label text`, `period_start date`, `period_end date`, `nomination_opens_at`, `nomination_closes_at`, `voting_opens_at`, `voting_closes_at`, `status text default 'upcoming'` (check: `upcoming`/`nominations_open`/`voting_open`/`closed`/`announced`). **Unique**: `(category_id, period_start, period_end)` — no overlapping duplicate periods.

**`award_nominations`** — `id`, `period_id FK`, `nominee_profile_id FK`, `nominated_by FK null` (null = system-generated based on engagement threshold), `status text default 'pending'` (check: `pending`/`approved`/`rejected` — admin gate before a nominee is votable), `created_at`. **Unique**: `(period_id, nominee_profile_id)`.

**`award_votes`** — `id`, `period_id FK`, `nomination_id FK`, `voter_profile_id FK`, `created_at`. **Unique**: `(period_id, voter_profile_id)` — this single constraint is what enforces "one vote per member per period" at the database level, not just in application code. RLS insert policy additionally checks (via a SECURITY DEFINER helper) that the period's `status = 'voting_open'` and, via a trigger, that `voter_profile_id <> nomination.nominee_profile_id` (no self-voting).

**`award_winners`** — `id`, `period_id FK unique`, `nomination_id FK`, `vote_count int`, `announced_at`, `badge_id FK null` (auto-issues a badge on win). Computed once by an admin action/Edge Function when voting closes; immutable afterward — the permanent "Fan of the Month" archive.

### 9. Moderation

**`reports`** — `id`, `reporter_id FK`, `target_type text` (check: `post`/`comment`/`user`/`message`), `target_id uuid` (polymorphic, paired with `target_type`), `reason text`, `details text null`, `status text default 'open'` (check: `open`/`under_review`/`actioned`/`dismissed`), `created_at`, `resolved_at null`, `resolved_by FK null`.

**`moderation_actions`** — `id`, `moderator_id FK`, `target_type`, `target_id`, `action_type text` (check: `content_removed`/`user_warned`/`user_suspended`/`user_banned`/`report_dismissed`), `reason text`, `report_id FK null`, `created_at`, `expires_at null` (time-boxed suspensions).

**`user_blocks`** — `blocker_id FK`, `blocked_id FK`, `created_at`. **PK**: `(blocker_id, blocked_id)`. Check: `blocker_id <> blocked_id`.

**`user_mutes`** — same shape as blocks, softer semantics (hides content without a mutual interaction bar).

### 10. Admin/roles

**`roles`** — `id`, `key text unique` (`super_admin`/`moderator`/`content_manager`/`match_manager`/`award_manager`), `name`, `description`. Lookup table, not a boolean flag on `profiles` — supports fine-grained, extensible permissions.

**`user_roles`** — `profile_id FK`, `role_id FK`, `granted_at`, `granted_by FK null`. **PK**: `(profile_id, role_id)` — many-to-many; a user can hold multiple roles. All admin-gated RLS policies check this via one shared helper function (`public.has_role(role_key text)`), rather than duplicating role logic per table.

---

## G. Unique constraints (summary)

`profiles.username`; `social_links(profile_id, platform)`; `post_reactions(post_id, user_id)`; `comment_reactions(comment_id, user_id)`; `follows(follower_id, following_id)` (via PK); `community_rooms.slug`; `predictions(profile_id, match_id)`; `prediction_scores.prediction_id`; `matches.external_ref`; `award_periods(category_id, period_start, period_end)`; `award_nominations(period_id, nominee_profile_id)`; `award_votes(period_id, voter_profile_id)`; `award_winners.period_id`; `badges.key`; `user_badges(profile_id, badge_id)`; `fan_levels.min_points`; `roles.key`.

## H. Recommended indexes (summary, beyond PK/unique)

- Feed/listing: `posts(club_id, created_at desc)`, `comments(post_id, created_at)`, `messages(conversation_id, created_at)`
- Fan-out lookups: `follows(following_id)`, `notifications(recipient_id, created_at desc)`, partial `notifications(recipient_id) where read_at is null`
- Leaderboards: `profiles(fan_points desc)`, `engagement_snapshots(period_start, period_end, score desc)`
- Match/prediction: `matches(club_id, kickoff_at)`, `match_events(match_id)`, `predictions(match_id)`
- All FK columns not already covered by the above get a plain index (Postgres doesn't auto-index FKs).

## I. RLS strategy

Consistent posture across every table, extending the pattern already live on `profiles`:

- **Public-readable content** (posts, comments, reactions, players, matches, match_events, award winners/categories): `select using (true)`, or `using (status = 'published')` where a moderation status exists.
- **Owner-write-only** (posts, comments, social_links, predictions before lock, message drafts): `insert/update with check (profile_id = (select auth.uid()))`. Same optimized-auth-call pattern already used for `profiles`.
- **Participant-scoped private data** (messages, conversation_participants, DMs): `select using (exists (select 1 from conversation_participants where conversation_id = messages.conversation_id and profile_id = (select auth.uid())))`.
- **System-only write, no client access at all** (`point_events`, `prediction_scores`, `award_winners`, `moderation_actions`): no insert/update/delete grant to `anon`/`authenticated` whatsoever — writes happen exclusively through SECURITY DEFINER functions/triggers/Edge Functions, mirroring `handle_new_user`'s already-accepted pattern.
- **Admin-gated** (reports management, role grants, scoring_rules, badge catalog, award category management): `using (public.has_role('moderator'))` or the relevant role key, via the shared helper function proposed in §C.10.
- **Self-only visibility** (notifications, own point_events history, own reports filed): `using (recipient_id = (select auth.uid()))` / equivalent.

Every new table gets RLS enabled **at creation**, same discipline as `profiles` — no table ever ships open, and every migration gets an advisor check afterward (as has been done for every migration so far).

## J. Storage architecture

Extends the existing `avatars`/`covers` buckets (already public, already RLS'd by owner path prefix) with:

- **`post-media`** (public) — path `{author_id}/{post_id}/{filename}`. Read: public. Write: only the post's author.
- **`message-media`** (private, NOT public) — path `{conversation_id}/{message_id}/{filename}`. Read/write access keyed by `conversation_participants` membership, not uploader identity, since recipients need read access too — this is a materially different RLS shape from the owner-path pattern used for avatars.
- **`voice-messages`** (private) — same participant-scoped access as `message-media`; folded in as a `message_media.media_type = 'voice'` row, not a separate bucket concept.

No binary content ever goes into Postgres — every media reference is a `storage_path`/`avatar_url`-style text column, consistent with what's already built.

## K. Scoring/gamification architecture

Already detailed in §C.6. Core principle, restated: **`point_events` is the only source of truth; every displayed score is either that ledger or a cache/derivation of it.** Nothing is ever directly incremented by a client. `fan_points` (cached counter) and `fan_level` (threshold lookup) update via triggers on ledger insert; `engagement_snapshots` update via a scheduled job over a rolling window. This means: scores are always auditable (`point_events` shows exactly why), always recomputable (drop and rebuild the cache from the ledger if something ever looks wrong), and never directly writable by the user they belong to.

## L. Voting architecture

Already detailed in §C.8. The one-vote-per-period rule is enforced by a **unique constraint**, not application logic (`award_votes(period_id, voter_profile_id)`) — the strongest guarantee available, survives bugs in client code. Voting-window enforcement (`voting_opens_at`/`voting_closes_at`) is checked in the insert RLS policy against `award_periods.status`, so a vote literally cannot be inserted outside the open window regardless of what the client sends. Self-voting is blocked by a trigger cross-checking `award_nominations.nominee_profile_id`. Eligibility rules (e.g., minimum fan level or account age to vote) are an **open product decision** — the schema supports whatever rule is chosen by adding a condition to the same eligibility-check function, without a schema change.

## M. Community architecture

Posts/comments/reactions/follows as detailed in §C.3, with soft-deletion (`deleted_at`) everywhere user content lives, so moderation actions and referential integrity (comments on a "deleted" post, reactions on a "deleted" comment) never orphan or hard-fail. `status` fields (`published`/`hidden`/`removed`) give moderation a way to hide content without deleting it, distinct from the user's own soft-delete.

## N. Messaging architecture

Deliberately **unified** DM and community-chat infrastructure (`conversations`/`conversation_participants`/`messages`) rather than two parallel systems, discriminated by `conversations.kind`. Rationale: a "community room" and a "group DM" are structurally identical (a set of participants exchanging messages) — building them twice would duplicate the message/media/read-receipt logic for no benefit. The only thing genuinely different about rooms is that they need a public, browsable identity (name, slug, description) — hence the satellite `community_rooms` table applies *only* to room-kind conversations, keeping plain DMs lightweight.

## O. Notification architecture

Single `notifications` table, fed by triggers on the actions that should notify (new follower → insert notification; new comment on your post → insert notification; etc.) — each trigger lives on the *source* table (e.g., a trigger on `comments` insert), not in application code, so notifications can't be silently skipped by a client bypassing some code path. `subject_type`/`subject_id` are **polymorphic** (see §V for why that's an accepted tradeoff here specifically).

## P. Match/prediction architecture

Already detailed in §C.7. The explicit design goal — "match data can eventually come from an external provider" — is served by `matches.external_ref` (unique, nullable) and `players.external_ref`: a future sync job upserts on `external_ref`, and nothing about the schema assumes a specific provider's field names or IDs. `scoring_rules` being versioned by `active_from`/`active_to` means changing point values for future matches never silently rewrites the score of a match that already happened.

## Q. Moderation architecture

Already detailed in §C.9. `reports` (member-initiated) and `moderation_actions` (staff-initiated, optionally linked back to a report) are kept as two tables rather than one, because a moderation action doesn't always originate from a report (proactive moderation) and a report doesn't always result in an action (dismissed) — collapsing them would force nullable fields in both directions for no gain.

## R. Admin/role architecture

Already detailed in §C.10. Many-to-many `roles`/`user_roles` rather than a single `role` column on `profiles`, because the feature list implies genuinely distinct responsibilities (content moderation vs. match data entry vs. award management) that a future admin might want to grant separately — e.g., a "match manager" who enters lineups shouldn't automatically also be able to ban users.

## S. Realtime considerations (design only — not enabling anything now)

- `messages` INSERT → Realtime `postgres_changes`, naturally scoped by the same RLS used for reads (a client only receives inserts for conversations they're a participant in — Supabase Realtime enforces the table's RLS for `postgres_changes` subscriptions).
- `notifications` INSERT → per-recipient Realtime channel, RLS-scoped to `recipient_id = auth.uid()`.
- `match_events` INSERT → public Realtime broadcast for live match-discussion pages (no auth required to read).
- **Presence** (online/typing indicators, "who's viewing this match thread") — Supabase Realtime's Presence feature is ephemeral and channel-based; it does **not** need or want a backing table (an `online_status` table would just be a constantly-thrashing write target for no benefit). Worth stating explicitly so this isn't accidentally built later.

## T. Web/mobile compatibility

Nothing above is web-specific. Every table, RLS policy, and Storage bucket is consumed identically by the existing `@supabase/supabase-js` web client and by whatever Expo/React Native client eventually ships — same project, same Auth users, same RLS. Mobile support is a client-wiring task when it happens, not a schema change.

## U. Migration strategy (for when this is approved)

Proposed as independently-reviewable migrations, in dependency order (matches the domain grouping in §B), each followed by an advisor check — the same discipline used for every migration so far:

1. `roles` / `user_roles` / `has_role()` helper (admin scaffold first, since later RLS policies depend on it)
2. `clubs` seam + backfill `club_id` reference points
3. `social_links` + additive nullable `profiles` columns
4. Community content: `posts` → `post_media` → `comments` → `post_reactions`/`comment_reactions` → `mentions` → `follows`
5. Messaging: `conversations` → `conversation_participants` → `community_rooms` → `messages` → `message_media`
6. `notifications` + its feeder triggers
7. Gamification: `point_events` → trigger to sync `profiles.fan_points` → `fan_levels` → `engagement_snapshots` → `badges`/`user_badges`
8. Match/prediction: `players` → `matches` → `match_events` → `scoring_rules` → `predictions` → `prediction_scores`
9. Awards: `award_categories` → `award_periods` → `award_nominations` → `award_votes` → `award_winners`
10. Moderation: `reports` → `moderation_actions` → `user_blocks`/`user_mutes`

Every migration is additive to the existing live `profiles` table and its 1 real row — nothing here requires touching or risking currently-working data.

## V. Risks and architectural decisions (called out explicitly, not buried)

- **Polymorphic references** (`notifications.subject_id`, `reports.target_id`) trade referential integrity for flexibility. Deliberate: a notification legitimately needs to point at posts, comments, messages, awards, etc., and a dedicated nullable FK column per possible type would mean a dozen-plus always-mostly-null columns. Accepted because notifications/reports are operational/ephemeral data, not the kind of record (like reactions or votes) where DB-enforced integrity is load-bearing for correctness.
- **Ledger write amplification**: every point-earning action writes to `point_events` *and* triggers a counter update on `profiles`. Fine at current scale; if event volume gets large, the counter-sync trigger can be swapped for a batched/queued recompute without changing the ledger's shape.
- **`pg_cron` not yet installed** — needed for scheduled `engagement_snapshots` computation and prediction-deadline locking. Flagged as a prerequisite to enable when those phases actually start, not needed for anything in this proposal to be created.
- **Award voting eligibility rules are an open product question** (minimum fan level? account age? one nomination limit?) — the schema is deliberately permissive here (a pluggable eligibility-check function) rather than guessing a specific rule now.
- **`predictions` flattened instead of the earlier normalized `predictions`+`prediction_answers` split** from the original architecture doc — a deliberate simplification, consistent with the same "fixed known field set → typed columns" reasoning already applied to `profiles`. Worth your explicit sign-off since it's a change from what was proposed earlier, not an oversight.
- **Multi-club seam reaffirmed, not expanded**: `clubs`/`club_id` columns as originally scoped — still just the seam, not multi-club UI or logic.

---

## ERD (text form — major entities only, not every column)

```
auth.users (Supabase-owned)
   │ 1:1
   ▼
profiles ──────────────┬──────────────┬───────────────┬────────────────┐
   │ 1:N                │ 1:N          │ 1:N            │ M:N            │
   ▼                    ▼              ▼                ▼                │
social_links        posts          predictions      user_roles ──► roles │
                       │ 1:N            │ 1:1                            │
                       ▼                ▼                                │
                   post_media    prediction_scores                       │
                       │                                                 │
                       │ 1:N                                             │
                       ▼                                                 │
                   comments (self-referencing via parent_comment_id)     │
                       │ 1:N                                             │
                       ▼                                                 │
                comment_reactions          post_reactions ◄── posts      │
                                                                          │
profiles ◄──M:N (follows)──► profiles                                   │
profiles ◄──M:N (user_blocks / user_mutes)──► profiles                  │
                                                                          │
conversations ──1:N── conversation_participants ──N:1── profiles        │
     │ 1:1 (room kinds only)        │ 1:N                                │
     ▼                              ▼                                    │
community_rooms                 messages ──1:N── message_media           │
                                                                          │
profiles ──1:N── notifications (polymorphic subject_type/subject_id)    │
                                                                          │
profiles ──1:N── point_events ──► profiles.fan_points (cached, trigger) │
profiles ──1:N── user_badges ──N:1── badges                             │
profiles ──1:N── engagement_snapshots                                   │
                                                                          │
clubs ──1:N── players ──1:N── match_events ──N:1── matches ──N:1── clubs│
matches ──1:N── predictions ──N:1── profiles                            │
matches ──1:N── scoring_rules (via club_id, versioned by active_from)   │
                                                                          │
award_categories ──1:N── award_periods ──1:N── award_nominations        │
award_periods ──1:N── award_votes ──N:1── award_nominations             │
award_periods ──1:1── award_winners ──N:1── award_nominations           │
award_winners ──0:1── badges (auto-issued)                              │
                                                                          │
profiles ──1:N── reports ──0:1── moderation_actions ──N:1── profiles ───┘
                  (target_type/target_id polymorphic on both)
```

---

## Summary for approval

Nothing has been created. This document proposes ~35 new tables across 9 domains, all additive to the existing live `profiles` table, all following the same RLS/auditability/soft-delete patterns already established. Waiting for review before writing any migration.

---

## W. Implementation deviations (added after implementation — migrations 001–010 + storage)

This proposal was approved and implemented as migrations `001`–`010` plus a storage-bucket migration, in the exact order specified. The schema, RLS posture, and table shapes described above were built as designed. This section records the handful of places where an implementation decision was needed that this document didn't spell out, or where an actual defect was found and fixed. Full migration-by-migration detail (tables, functions, policies, indexes, advisor findings) lives in `docs/architecture/database-implementation-log.md`; this section only covers substantive deviations from what's written above.

1. **§C.1 profile columns, scheduling clarification.** This document's table sketch listed the additive profile columns as "for later, not now" while §U's migration order put them in migration 003. Resolved by splitting them: `matchday_routine`, `fan_style`, `favourite_chant` (no dependencies) were added in 003; `favourite_player_id` (FK to `players`, which doesn't exist until 008) was deferred to 008, where its target table is created.

2. **§C.9/§D moderation write path.** `moderation_actions` is system-only per §D ("no insert/update/delete grant to anon/authenticated whatsoever — writes happen exclusively through SECURITY DEFINER functions"). The concrete function is `public.record_moderation_action(target_type, target_id, action_type, reason, report_id?, expires_at?)` — it checks `has_role('moderator')`/`has_role('super_admin')` internally and inserts on the caller's behalf. It deliberately does **not** also apply the action's real-world effect (hide a post, suspend a user) — no enforcement columns/logic for that exist yet anywhere in this schema, and building them is admin-dashboard scope, not this phase. `moderation_actions` visibility is restricted to staff (`has_role('moderator')`/`super_admin`); the target of an action does not see their own moderation history — not specified either way in this document, and a conservative default given no product decision was made.

3. **`user_blocks`/`user_mutes` visibility.** Restricted to the blocker/muter only — the blocked/muted party cannot see who blocked/muted them. This document didn't specify a direction; hiding it from the blocked party is the conventional privacy default (prevents retaliation) and was applied as such.

4. **Predictions kept strictly owner-private.** `predictions` rows are readable only by their own owner, including after a match completes and scores are settled. §C.7/§P didn't specify whether predictions become visible to others post-match (e.g. for a "how did everyone predict" feature); no such visibility was built.

5. **Match lock enforcement.** Locking predictions at kickoff is enforced by comparing `now()` against `matches.kickoff_at` directly in the RLS predicate, rather than via a separately-populated `locked_at` field — avoids needing a cron job to flip a flag, per the explicit instruction not to introduce `pg_cron` this phase.

6. **Role assignment for un-specified admin actions.** Where this document named a permission as "admin-gated" without naming which role, the most topically relevant role was used: `clubs` management and `scoring_rules` management default to `super_admin`; community-room creation (`conversations` with `kind` in `community_room`/`regional_room`) requires `moderator`.

7. **No automatic point-award triggers.** `point_events` (the gamification ledger) and its `sync_fan_points()`/`sync_fan_level()` triggers exist and work, but nothing yet inserts into `point_events` for community actions (posting, commenting, predicting correctly, etc.) — this document didn't specify point values per action, and inventing them wasn't in scope. The ledger is ready for a future phase to start writing to it.

8. **Bug found and fixed during storage implementation, not caused by it.** Migration 005's `conversation_participants` table had two RLS policies that self-referenced `conversation_participants` from within its own policy expression (the "co-participants" SELECT policy, and the admin-add branch of the INSERT policy). Postgres cannot evaluate that — every authenticated query against `conversation_participants` failed with `42P17: infinite recursion detected in policy`, which transitively broke `conversations`, `messages`, `message_media`, and the new storage policies (anything that checks conversation membership). Fixed with the standard Supabase pattern: two `SECURITY DEFINER` helper functions, `public.is_conversation_participant(conversation_id)` and `public.is_conversation_admin(conversation_id)`, each checking only `auth.uid()` (never an arbitrary profile, so they can't be used to enumerate other users' conversation membership via direct RPC call). The two broken policies, and the storage policies that were about to inherit the same bug, were rewritten to call these functions instead of self-joining. This was a genuine latent defect in migration 005 that had gone uncaught until a live behavioral test happened to exercise it — see the implementation log for the full test trail.
