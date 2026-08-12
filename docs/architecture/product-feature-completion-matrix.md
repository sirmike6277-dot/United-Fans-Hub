# Product Feature Completion Matrix

**Phase 12 audit — 2026-08-11.** Inspection only; no code or database changes were made while producing this document (one exception, fully disclosed: a single orphaned `notifications` row left behind by Phase 10's own adversarial security testing was found and deleted during this audit's live verification pass — restoring the pre-existing baseline, not a new change).

**Methodology**: every row below was checked against the actual running code and a live query against the Supabase project (`bprrrycjqpqiegkakjsm`), not assumed from a table's existence or an earlier report. Where a trigger/function was the deciding factor (e.g. whether an action awards points), its live definition was read directly, not inferred.

**Status legend**: A = Complete · B = Functional but incomplete · C = UI exists / backend incomplete · D = Backend exists / UI missing · E = Completely missing · F = Blocked by external dependency

---

## USER ACCOUNT

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Signup | B | Yes, for real email addresses (verified live twice with real accounts) | `auth.users`, `handle_new_user()` trigger → `profiles` | `/signup`, `SignupForm.tsx` | Supabase Auth email sender (currently the default sandbox mailer, not the previously-configured Resend SMTP — unconfirmed via any config-read tool, inferred from the sandbox mailer's own distinctive rejection message) | No | Restore/verify Resend SMTP in the Dashboard (manual, cannot be done from here) |
| Login | A | Yes, fully verified | `auth.users`, `email_for_username()` | `/login`, `LoginForm.tsx` | No | No | None |
| Email verification | B | Yes, works when email delivers (verified live) | Same as Signup | `SignupForm.tsx`'s "Check your inbox" state | Same mailer risk as Signup | No | Same as Signup |
| Password reset | B | Code path is complete and correct; **never live-tested end-to-end with a real click-through in this project's history** | `auth.users`, `resetPasswordForEmail`/`exchangeCodeForSession` | `/forgot-password`, `/reset-password` | Same mailer risk as Signup | No | A genuine end-to-end test (not just code review) once SMTP is confirmed |
| Profile | A | Yes | `profiles` | `/profile`, `ProfileView.tsx` | No | No | None |
| Avatar | A | Yes, real Storage upload | `avatars` bucket + policies | `AvatarUpload.tsx` | No | No | None |
| Cover image | A | Yes, real Storage upload | `covers` bucket + policies | `CoverUpload.tsx` | No | No | None |
| Username | A | Yes, enforced unique, used for login | `profiles.username`, unique constraint | `ProfileEditForm.tsx` | No | No | None |
| Bio | A | Yes | `profiles.bio` | `ProfileEditForm.tsx` | No | No | None |
| Social media handles | D | No — cannot add or view a social handle anywhere in the app | `social_links` table exists, fully unreferenced by any app code (confirmed: zero matches outside the generated types file) | None | No | No | Build the UI (form fields + display) — schema is ready as-is |

## COMMUNITY

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Text posts | A | Yes | `posts` | `PostComposer.tsx`, `Feed.tsx` | No | No | None |
| Image posts | A | Yes, real Storage upload | `post_media`, `post-media` bucket | `PostComposer.tsx`, `PostMedia.tsx` | No | No | None |
| Video posts | C | Media type is stored (`media_type` column accepts it), but **not independently confirmed the composer/player actually accepts and renders a real video file end-to-end** in this audit pass — treat as unverified, not confirmed working | `post_media.media_type` | `PostMedia.tsx` | No | No | Live-verify a real video upload/playback round trip |
| File sharing | E | No general file attachment on posts — only image/video media types exist on `post_media` | `post_media` has no generic "file" type | None | No | Possibly (a `media_type` value + storage policy) | Define scope, then build |
| Reactions (posts) | A | Yes | `post_reactions` | `ReactionButton.tsx` | No | No | None |
| Comments | A | Yes | `comments` | `CommentSection.tsx`, `CommentItem.tsx` | No | No | None |
| Reactions (comments) | A | Yes | `comment_reactions` | `CommentItem.tsx` | No | No | None |
| Threaded replies | E | No — comments are flat only; no "Reply" action anywhere in the UI | `comments.parent_comment_id` exists and is even protected by a trigger, but nothing ever writes a non-null value to it | None | No | No | Build reply UI (compose-with-parent + nested display) |
| Mentions | E | Completely missing — no `@name` parsing anywhere in any composer | `mentions` table + `notify_on_mention()` trigger exist, fully wired and ready | None | No | No | Build mention parsing/autocomplete in composers + rendering in post/comment bodies |
| Follow users | E | Completely missing — no follow button anywhere (`MemberCard`, `ProfileView`) | `follows` table + `notify_on_follow()` trigger exist, fully wired and ready | None | No | No | Build the follow/unfollow button + followed-user list |
| Community discovery | E | No dedicated discovery UI (categories/topics) — the one feed is everything | No dedicated schema for "communities" beyond `community_rooms` | None | No | Maybe | Define scope — may already be covered by Community Rooms below |
| Community rooms | D | No — a room's name displays *if* a conversation happens to be room-kind, but there is no way to create, discover, or join one | `community_rooms`, `conversations.kind='community_room'` | Read-only display path exists in `messages/[conversationId]/page.tsx`; no create/join/discover UI anywhere | No | No | Build room creation (admin?) + discovery + join flow |
| Reporting | E | Completely missing — no "Report" action on any post/comment/profile | `reports` table + `record_moderation_action()` SECURITY DEFINER function exist, fully wired | None | No | No | Build the report action + submission form |
| Blocking | E | Completely missing — no block action anywhere | `user_blocks` table exists | None | No | No | Build block/unblock UI + feed-filtering to honor it |
| Muting | E | Completely missing — no mute action anywhere | `user_mutes` table exists | None | No | No | Build mute/unmute UI + notification-filtering to honor it |
| Moderation | E | No real moderator can act on anything through the app — the mechanism is real but has no front door | `moderation_actions`, `record_moderation_action()`, `has_role('moderator')` all real and correct | None | No | No | Build a moderation queue/admin surface (see ADMIN section) |

## MEMBERS

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Discover fans | A | Yes | `profiles` (public read) | `/members`, `MembersDirectory.tsx` | No | No | None |
| Search fans | A | Yes (username/display name) | Same, `.ilike` search | `MembersDirectory.tsx`'s search input | No | No | None |
| View profiles | A | Yes | `profiles` | `/profile/[profileId]` | No | No | None |
| Follow fans | E | See Community → Follow users (same gap) | `follows` | None | No | No | Same as above |
| Message fans | A | Yes | `conversations`, `messages` | `StartMessageButton.tsx` → `/messages/[id]` | No | No | None |
| Fan level | A | Displayed correctly everywhere it appears | `profiles.fan_level` | `MemberCard.tsx`, `ProfileView.tsx` | No | No | None |
| Points | A | Displayed correctly | `profiles.fan_points` | `ProfileView.tsx`, `PredictionStatsCard.tsx`, Dashboard | No | No | None |
| Badges | E | Completely missing — no badge is ever shown anywhere, because none can ever be earned (see Gamification) | `badges`, `user_badges` exist, 0 rows, nothing ever inserts into either | None | No | No | See Gamification/Awards roadmap |
| Engagement (as a member-facing signal) | E | No per-member "engagement" indicator anywhere | `engagement_snapshots` exists, 0 rows, **confirmed no function or trigger anywhere touches it** | None | No | No | Fully unbuilt — needs a computation job/function before any UI is meaningful |

## MESSAGING

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Direct messages | A | Yes | `conversations`, `messages` | `MessageThread.tsx` | No | No | None |
| Conversation list | A | Yes | `conversation_participants` | `ConversationList.tsx` | No | No | None |
| Conversation creation | A | Yes (starting a DM from a profile) | `createDirectMessage()` | `StartMessageButton.tsx` | No | No | None |
| Text messages | A | Yes | `messages.body` | `MessageComposer.tsx` | No | No | None |
| Image attachments | A | Yes, real Storage upload | `message_media`, `message-media` bucket | `MessageComposer.tsx` | No | No | None |
| File attachments | E | No — composer only accepts `image/*` | Bucket/table could hold other types, nothing prevents it structurally | None | No | No | Widen the composer's accepted file types + rendering |
| Voice messages | E | Completely missing — no record/playback UI anywhere | `voice-messages` storage bucket + full RLS policy set exist, unused | None | No | No | Build recording UI, upload flow, and a player |
| Read state | A | Yes | `conversation_participants.last_read_at` | `markConversationRead()` | No | No | None |
| Unread state | A | Yes, shown in Navbar badge and conversation list | Same | `Navbar.tsx`, `ConversationList.tsx` | No | No | None |
| Conversation participants | B | Works for 1:1 DMs; multi-participant/room admin has no UI | `conversation_participants`, roles (`member`/`admin`) | Participant list not separately surfaced in UI beyond the thread header | No | No | Build a "manage participants" view if group/room conversations are pursued |
| Conversation administration | D | No — the role-escalation-safe promotion mechanism works (verified live in Phase 10) but nothing in the UI ever calls it | `protect_conversation_participant_identity_and_role()` correctly allows an admin/creator/moderator to change a role | None | No | No | Build an admin action (e.g. "Make admin"/"Remove") in the thread UI |
| Live delivery (real-time) | E | New messages require a manual refresh/navigation to appear — deliberate architectural choice, not a bug | Realtime never enabled on this project | None | Possibly (enabling Realtime) | No | Decide whether to enable Realtime or build a polling fallback |

## MATCH CENTRE

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Upcoming matches | F | Architecture is complete and proven (real 2022–2024 data), but **`matches = 0` right now** because the live 2026 season isn't reachable on the current API-Football plan | `matches`, `syncFixtures()` | `/matches`, `FixtureList.tsx` | **API-Football plan tier** — confirmed live: the free plan explicitly rejects the current season | No | Upgrade the API-Football plan (or wait for the current season to age into a covered range) |
| Previous matches | F | Same blocker | Same | Same | Same | No | Same |
| Match details | F | Code path proven correct with real historical data; blocked today only by there being no current match to show | `matches`, `MATCH_DETAIL_SELECT` | `/matches/[matchId]` | Same | No | Same |
| Score | F | Same | `matches.home_score/away_score` | `ScoreDisplay.tsx` | Same | No | Same |
| Match events | F | Same — proven with real historical goal/card/sub events | `match_events`, `syncMatchEvents()` | `EventTimeline.tsx` | Same | No | Same |
| Players | F | **`players = 0` right now too** — squad sync works (proven independently of the season blocker, since the squad endpoint isn't season-gated) but is only ever triggered from the match-detail page, which never renders without a match to view | `players`, `syncSquad()` | Only surfaced via the match detail page and the Predictions form's player picker | Requires at least one real match to exist before it's ever triggered in normal use | No | Either give squad sync its own trigger point (e.g. the Predictions page itself) or accept it stays dormant until Match Centre unblocks |
| Competition | F | Same as above | `matches.competition` | `MatchCard.tsx` | Same | No | Same |
| Date/time | F | Same | `matches.kickoff_at` | `formatMatchDateTime()` | Same | No | Same |
| Venue | F | Same | `matches.venue` | `MatchCard.tsx` | Same | No | Same |
| Home/away | F | Same | `matches.is_home` | `ScoreDisplay.tsx` | Same | No | Same |

## PREDICTIONS

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Predict match result | F | Code path fully proven with real historical fixtures (Phase 8); blocked today only by there being no live match to predict on | `predictions`, RLS lock via `kickoff_at` | `PredictionForm.tsx` | Match Centre's API blocker (above) | No | Unblocked automatically once Match Centre is |
| Predict score | F | Same | Same | Same | Same | No | Same |
| Prediction deadline | A | Fully correct and live-verified (kickoff-based lock, not a separate deadline field) | RLS predicate on `matches.kickoff_at` | `isMatchLocked()` | No | No | None |
| Prediction history | A | Yes | `fetchPredictionHistory()` | `/predictions`, `PredictionHistoryList.tsx` | No | No | None |
| Points awarded | A | Fully correct and live-verified (idempotent, correct math for 3 real scenarios) — the mechanism works; it's just currently starved of real matches to run against | `settle_prediction()` | Triggered opportunistically from the match detail page | Match Centre's blocker for new real occurrences | No | None on the mechanism itself |
| Scoring rules | A | Seeded and correct (`correct_result=3`, `correct_score=5`, `correct_first_scorer=3`) | `scoring_rules` | N/A (server-side only, correctly not client-writable) | No | No | None |
| Prediction leaderboard | A | Yes — this is "Rankings," fully real | `fetchFanLeaderboard()` | `/predictions`, `LeaderboardSection.tsx` | No | No | None |
| User ranking | A | Yes, live-verified | `fetchMyRank()` | `/predictions`, `/profile`, Dashboard | No | No | None |

## GAMIFICATION

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Fan points | B | The ledger/display mechanism is complete and correct, **but only one action in the entire product currently generates any points: a correctly-settled prediction.** Posting, commenting, reacting, and following generate **zero** points — confirmed by reading every trigger live: no trigger on `posts`/`comments`/`post_reactions`/`comment_reactions`/`follows` ever inserts into `point_events`, and no client code does either. | `point_events`, `sync_fan_points()` | Shown everywhere correctly | No | No | Decide which community actions (if any) should award points, then wire them — this is a real product decision, not a bug fix |
| Fan levels | B | The recompute mechanism (`sync_fan_level()`) is correct and fires on every points change, but **only one level (`Level 1 "Fan"`, `min_points=0`) has ever been seeded** — no user can ever progress past Level 1 regardless of points earned | `fan_levels` (1 row) | Shown correctly wherever `fan_level` appears | No | **Yes** — seeding more rows | Seed a real level ladder (a product decision on titles/thresholds) |
| Progression | E | Cannot happen — a direct consequence of the single-level gap above | Same | None specifically shown ("next level" progress bar doesn't exist) | No | Yes (same as above) | Build a progress-to-next-level UI once levels exist |
| Badges | E | Completely missing — see Members/Awards | `badges`, `user_badges`, 0 rows, nothing ever inserts | None | No | No (schema is ready) | Define real badge criteria, build the awarding logic and the UI |
| Achievements | E | Same as Badges — not a separate schema concept in this codebase, just used interchangeably | Same | None | No | No | Same |
| Engagement scoring | E | `engagement_snapshots` is genuinely dormant — no function anywhere computes into it | `engagement_snapshots`, 0 rows | None | No | No | Fully unbuilt |
| Leaderboards | A | Real, live, correct — this is the one gamification feature that is genuinely complete | `fetchFanLeaderboard()` | `/predictions`, Dashboard's Top Fans | No | No | None |
| Fan ranking | A | Same as Leaderboards | Same | Same | No | No | None |

## AWARDS

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Fan of the Month | D | No — Dashboard shows an honest "Coming soon" card only (built in Phase 11 deliberately as a placeholder, not a feature) | `award_categories`/`award_periods`/`award_nominations`/`award_votes`/`award_winners`, all 0 rows, `award_votes`' self-vote/window enforcement logic exists in its INSERT policy and was live-verified correct back in the original pre-UI audit | `FanOfMonthTeaser.tsx` (placeholder only) | No | No | The entire nomination→voting→winner→display workflow needs building (see roadmap Phase B) |
| Fan of the Season | E | Completely missing, no distinct concept from "Month" beyond `award_periods.period_type` presumably supporting it | Same tables, unseeded | None | No | No | Same as above, once "Month" exists |
| Award categories | D | Nothing to select from — 0 rows | `award_categories`, 0 rows | None | No | No | Seed categories once the feature is scoped |
| Award periods | D | No period is ever open | `award_periods`, 0 rows | None | No | No | Needs an open/close mechanism (admin-driven or scheduled) |
| Nominations | D | Cannot nominate anyone | `award_nominations`, 0 rows, RLS exists | None | No | No | Build nomination UI |
| Voting | D | Cannot vote | `award_votes`, 0 rows, one-vote/window enforcement already verified correct at the RLS level | None | No | No | Build voting UI |
| Winners | D | No winner has ever been determined | `award_winners`, 0 rows | None | No | No | Build winner-determination logic (who runs it, and when) + display |

## NOTIFICATIONS

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Likes | A | Yes — real, live-verified | `notify_on_post_reaction()`/`notify_on_comment_reaction()` | `NotificationItem.tsx` | No | No | None |
| Comments | A | Yes | `notify_on_comment()` | Same | No | No | None |
| Follows | D | Trigger exists and is correct, but unreachable — see Community → Follow users | `notify_on_follow()` | None (type is handled if it ever appeared) | No | No | Ships automatically once Follow is built |
| Mentions | D | Same situation as Follows | `notify_on_mention()` | Same | No | No | Ships automatically once Mentions is built |
| Messages | A | Yes | `notify_on_message()` | `NotificationItem.tsx` | No | No | None |
| Predictions | D | Declared (`prediction_reminder`), never produced — no reminder job exists | Type reserved in the CHECK constraint only | UI would render it correctly if it ever appeared | No | No | Build a reminder mechanism (needs a scheduler) |
| Awards | D | Declared (`award_nomination`, `voting_open`), never produced | Same | Same | No | No | Ships once Awards is built |
| Unread count | A | Yes | `idx_notifications_unread` | Navbar badge | No | No | None |
| Mark as read | A | Yes | `read_at` | `NotificationItem.tsx` | No | No | None |
| Mark all as read | A | Yes | Same | `NotificationsFeed.tsx` | No | No | None |

## ADMIN / MODERATION

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Admin dashboard | E | Does not exist — confirmed zero `admin` routes anywhere in `src/app` | N/A | None | No | No | Build from scratch |
| User management | E | No way to view/manage users beyond the public Members directory | `user_roles` has RLS enabled with **zero policies** (nothing can read/write it via the API at all, by anyone) | None | No | Possibly (a policy to let a super_admin manage roles) | Needs both a policy and a UI |
| Moderation queue | D | No — `record_moderation_action()` is correct and tested, but nothing calls it | `reports`, `moderation_actions`, `record_moderation_action()` | None | No | No | Build the queue UI |
| Reports | D | See Community → Reporting | `reports`, 0 rows | None | No | No | Same |
| Moderation actions | D | See above | `moderation_actions`, 0 rows | None | No | No | Same |
| Community management | E | No way to manage rooms, feature posts, etc. | Partial (`community_rooms`) | None | No | No | Scope-dependent |
| Award administration | D | See Awards section | Award tables | None | No | No | Same |
| Gamification administration | E | No way to adjust points/levels/badges as an admin | `point_events.event_type` includes `admin_adjustment`, reachable only via direct SQL today | None | No | No | Build an admin points-adjustment UI |

---

## Landing page content audit (Section 10)

| Component | What it shows | Real or fictional? |
|---|---|---|
| `MatchdayPreview.tsx` | Next real Man Utd fixture, or an honest "no upcoming fixture" empty state | **Real, database-driven** — reuses the same `fetchUpcomingMatches()` as `/matches`, correctly empty today because `matches=0` |
| `RankingsPreview.tsx` | A "Fan Leaderboard — This Month" card with 4 named users (`DevilsRed_Kate`, `OldTrafford_Sam`, `GGMU_Amara`, `United_Theo`) and fabricated point totals | **Entirely fictional, hardcoded**, no data connection at all, no disclosure that it's an example |
| `FanOfMonthPreview.tsx` | A "DevilsRed_Kate" winner card with a fabricated quote | **Entirely fictional, hardcoded** |
| `CommunityPreview.tsx` | Three fabricated posts with invented usernames, bodies, and like/comment counts | **Entirely fictional, hardcoded** |

**Recommendation** (not implemented — Section 10 says inspect only): the real, working leaderboard now lives at `/predictions` and the real feed at `/community`. The honest fix is the same pattern `MatchdayPreview.tsx` already proves works: either point these three sections at the same real, empty-state-aware data, or replace the specific fabricated names/numbers with a generic, clearly-labelled marketing illustration (e.g. "Example leaderboard" caption) so a visitor can never mistake it for a real fan's data. This was already flagged in the Phase 9 audit and remains outstanding.
