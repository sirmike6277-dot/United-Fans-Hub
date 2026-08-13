# Product Feature Completion Matrix

**Phase 12 audit — 2026-08-11**, refreshed **Phase 17 — 2026-08-12** (Fan Room reactions/replies/polls hardening), **Phase 18 — 2026-08-12** (Awards/voting loop, built end-to-end), and the **Safety Loop phase — 2026-08-12** (Report/Block/Mute, built end-to-end). Rows not called out as updated in one of those passes still reflect the original Phase 12 audit and have not been re-verified live since — see the roadmap doc for what's genuinely still open.

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
| Social media handles | A | Yes — can add/edit/view (Master Completion Phase) | `social_links` | `ProfileEditForm.tsx`, `ProfileView.tsx` | No | No | None |

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
| Threaded replies (comments) | A | Yes — one level, matches the "replies aren't further repliable" rule | `comments.parent_comment_id` + immutability trigger | `CommentSection.tsx`/`CommentItem.tsx` (Phase 13) | No | No | None |
| Mentions (posts/comments) | A | Yes — `@username` parsing + autocomplete + linkified rendering | `mentions`, `notify_on_mention()` | `MentionText.tsx`, composer autocomplete (Phase 13) | No | No | None |
| Follow users | A | Yes | `follows`, `notify_on_follow()` | Follow/unfollow button on `MemberCard`/`ProfileView` (Phase 13) | No | No | None |
| Community discovery | A | Covered by Community Rooms below — a curated, moderator-created set of topic rooms, not open user-created "communities" (a deliberate scope decision, not a gap) | `community_rooms` | `/community/rooms` | No | No | None |
| Community rooms | A | Yes — discover, create (moderator/admin), join/leave, chat, media, member management, kick/suspend/unban, all with confirmation dialogs | `community_rooms`, `conversations.kind='community_room'`, migration 024 | `/community/rooms`, `RoomsDirectory.tsx`, `RoomChat.tsx`, `RoomMembersPanel.tsx` (Phase 14, polished Phases 15/16/17) | No | No | None |
| Message reactions (Fan Rooms) | A | Yes — fixed 5-emoji set, add/remove/change, Realtime for other members' reactions | `message_reactions` (migration 028), Realtime (migration 033) | `MessageReactionBar.tsx` | No | No | None |
| Message replies (Fan Rooms) | A | Yes — one level, "replying to..." composer state, click-to-locate parent, graceful deleted-parent rendering | `messages.parent_message_id` (migration 029) | `RoomComposer.tsx`, `MessageBubble.tsx`, `RoomChat.tsx`'s `jumpToMessage()` (Phase 17) | No | No | None |
| Mentions (in messages) | A | Yes — restricted to real room members only (an outsider can't be mentioned into a room they can't read) | `mentions.message_id` (migration 030) | `RoomComposer.tsx`'s `MentionAutocomplete` | No | No | None |
| Fan Room polls | A | Yes — moderator/admin-only creation (migration 034, Phase 17 — tightened from the original "any member" rule), one vote per user, live results, closing | `room_polls`/`room_poll_options`/`room_poll_votes`, `room_poll_results()` (migration 027) | `RoomPollsPanel.tsx`, `PollCard.tsx`, `CreatePollDialog.tsx` | No | No | None |
| Reporting | A | Yes — `<ReportDialog>` reused from message toolbars, profile menus, and room headers; 5-reason enum, one report per reporter per target (real UNIQUE constraint) | `reports` (widened, migration 039), `record_moderation_action()` | `ReportDialog.tsx`, `ReportButton.tsx` | No | No | None |
| Blocking | A | Yes — "full mutual block": stops new DMs both directions (including into an already-existing DM), hides each other's Fan Room messages, blocks mentions both ways | `user_blocks`, `has_mutual_block()`/`has_blocked_participant_in_conversation()` (migration 040/041) | `ProfileActionsMenu.tsx`, `BlockedMutedPanel.tsx` (Settings → Privacy) | No | No | None |
| Muting | A | Yes — silently hides the muted user's Fan Room messages from the muter only; the muted user is completely unaffected and never notified | `user_mutes` (unchanged schema/RLS) | `ProfileActionsMenu.tsx`, `BlockedMutedPanel.tsx` | No | No | Community-feed (posts) and notification filtering weren't extended this phase — only Fan Room messages — disclosed scope limit |
| Moderation | A | Yes — a real moderator/admin can review reports and dismiss/warn/remove-content/suspend from `/moderation`, every action logged | `moderation_actions`, `record_moderation_action()`, `has_role('moderator')` | `/moderation`, `ModerationQueue.tsx` | No | No | None |

## MEMBERS

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Discover fans | A | Yes | `profiles` (public read) | `/members`, `MembersDirectory.tsx` | No | No | None |
| Search fans | A | Yes (username/display name) | Same, `.ilike` search | `MembersDirectory.tsx`'s search input | No | No | None |
| View profiles | A | Yes | `profiles` | `/profile/[profileId]` | No | No | None |
| Follow fans | A | See Community → Follow users — same feature, same status | `follows` | `MemberCard.tsx` | No | No | None |
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
| File attachments | B | DMs' composer still only accepts `image/*` (unchanged); Fan Rooms' composer accepts image/video/generic file (Phase "Master Completion") | `message_media.media_type` supports image/video/voice/file | `RoomComposer.tsx` (rooms) vs `MessageComposer.tsx` (DMs, image-only) | No | No | Widen the DM composer too, if DMs are meant to reach parity with rooms |
| Voice messages | E | Completely missing — no record/playback UI anywhere | `voice-messages` storage bucket + full RLS policy set exist, unused | None | No | No | Build recording UI, upload flow, and a player |
| Read state | A | Yes | `conversation_participants.last_read_at` | `markConversationRead()` | No | No | None |
| Unread state | A | Yes, shown in Navbar badge and conversation list | Same | `Navbar.tsx`, `ConversationList.tsx` | No | No | None |
| Conversation participants | B | Works for 1:1 DMs; Fan Rooms have a full member-management UI (`RoomMembersPanel.tsx`) — this row is specifically about plain multi-participant DM/group_dm, which still has none | `conversation_participants`, roles (`member`/`admin`) | Participant list not separately surfaced for group_dm beyond the thread header | No | No | Build a "manage participants" view if group DMs (not rooms) are pursued |
| Conversation administration | D | No — the role-escalation-safe promotion mechanism works (verified live in Phase 10) but nothing in the UI ever calls it for a plain DM/group_dm (Fan Rooms have their own moderator/admin system instead, unrelated to this row) | `protect_conversation_participant_identity_and_role()` correctly allows an admin/creator/moderator to change a role | None | No | No | Build an admin action (e.g. "Make admin"/"Remove") in the DM thread UI, if group DMs are pursued |
| Live delivery (real-time) | A (Fan Rooms) / F (DMs, not re-verified) | Fan Rooms: yes — messages, reactions, and new polls all push live (migrations 025, 033); vote totals use a disclosed periodic-refresh substitute, not push, since vote privacy RLS blocks a live aggregate (see Phase 17 report) | `messages`/`message_reactions`/`room_polls` in the `supabase_realtime` publication | `RoomChat.tsx` | No | No | DMs' own live-delivery status wasn't re-checked this phase — out of scope for Phase 17, which focused on Fan Rooms |

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
| Fan levels | A | A real 6-level ladder is seeded (migration 031, documented in `docs/architecture/fan-points-rules.md`) — users do progress as points accrue | `fan_levels` (6 rows), `sync_fan_level()` | Shown correctly wherever `fan_level` appears | No | No | None |
| Progression | A | Yes — a real "next level" progress bar | Same | `FanLevelProgress.tsx` (Master Completion Phase) | No | No | None |
| Badges | E | Completely missing — see Members/Awards | `badges`, `user_badges`, 0 rows, nothing ever inserts | None | No | No (schema is ready) | Define real badge criteria, build the awarding logic and the UI |
| Achievements | E | Same as Badges — not a separate schema concept in this codebase, just used interchangeably | Same | None | No | No | Same |
| Engagement scoring | E | `engagement_snapshots` is genuinely dormant — no function anywhere computes into it | `engagement_snapshots`, 0 rows | None | No | No | Fully unbuilt |
| Leaderboards | A | Real, live, correct — this is the one gamification feature that is genuinely complete | `fetchFanLeaderboard()` | `/predictions`, Dashboard's Top Fans | No | No | None |
| Fan ranking | A | Same as Leaderboards | Same | Same | No | No | None |

## AWARDS

**Built end-to-end in Phase 18** (nomination → moderator approval → voting → winner determination → reveal), reusing the schema that had existed since migration 009 — see the Phase 18 report for what was reused vs. genuinely fixed/added.

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Fan of the Month | A | Yes — nominate, vote, see the real winner (Dashboard's `FanOfMonthTeaser` now shows the real latest winner, or an honest "vote now" link if none yet) | `award_categories` (seeded, migration 037) | `/awards`, `FanOfMonthTeaser.tsx` | No | No | None |
| Fan of the Season | A | Same loop, same UI, different category | Same tables | `/awards` (tab) | No | No | None |
| Award categories | A | Two real categories seeded (`fan_of_month`, `fan_of_season`) | `award_categories` (migration 037) | `/awards` tabs | No | No | None |
| Award periods | A | Moderator/admin can create a period and advance it through upcoming → nominations_open → voting_open → closed → announced | `award_periods` | `AwardPeriodAdminPanel.tsx` | No | No | None |
| Nominations | A | Any member can nominate (not themselves — enforced server-side, migration 035); a moderator/admin approves/rejects before it's visible to vote on | `award_nominations` | `NominationForm.tsx`, admin review queue | No | No | None |
| Voting | A | One vote per member per period (structural — a real UNIQUE(period_id, voter_profile_id) constraint, same guarantee as room_poll_votes' composite PK); self-voting blocked | `award_votes`, `award_vote_counts()` (migration 037) | `NomineeVoteCard.tsx` | No | No | Votes cannot be changed once cast — an existing schema property (no UPDATE/DELETE policy), not something Phase 18 added or could easily change without a new migration |
| Winners | A | Real winner determined by actual vote count (tie-break: earliest nomination) via `determine_award_winner()` (migration 036), never fabricated | `award_winners` | `WinnerAnnouncement.tsx`, Dashboard teaser, `/awards` history archive | No | No | None |

## NOTIFICATIONS

| Feature | Status | User Can Use It? | Backend | UI | External Dependency | DB Change Needed | Remaining Work |
|---|---|---|---|---|---|---|---|
| Likes | A | Yes — real, live-verified | `notify_on_post_reaction()`/`notify_on_comment_reaction()` | `NotificationItem.tsx` | No | No | None |
| Comments | A | Yes | `notify_on_comment()` | Same | No | No | None |
| Follows | A | Yes — Follow is built (Phase 13), the trigger fires for real now | `notify_on_follow()` | `NotificationItem.tsx` | No | No | None |
| Mentions | A | Yes — for posts/comments and, since the Master Completion Phase, Fan Room messages too (deep-links to `/community/rooms/[roomId]?message=...`, Phase 17) | `notify_on_mention()` | `NotificationItem.tsx`, `resolveMessageHref()` | No | No | None |
| Messages | A | Yes — room replies (not every room message, to avoid spam, see migration 032) navigate to the specific message via the same `?message=` deep link | `notify_on_message()` | `NotificationItem.tsx` | No | No | None |
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
| Moderation queue | A | Yes — filterable by status/type, gated to `moderator`/`super_admin`, real-time new-report updates | `reports`, `moderation_actions`, `record_moderation_action()` | `/moderation`, `ModerationQueue.tsx` | No | No | "Remove content"/"warn"/"suspend" only offered for report target types moderation_actions itself supports (post/comment/user/message) — room/poll/nomination reports can be dismissed but not actioned from here (disclosed scope limit, see roadmap) |
| Reports | A | See Community → Reporting | `reports` (widened, migration 039) | `ReportDialog.tsx` | No | No | None |
| Moderation actions | A | See above | `moderation_actions` | `ModerationQueue.tsx` | No | No | None |
| Community management | B | Fan Rooms have a real moderator/admin surface (create room, create poll, kick/suspend/unban with confirmation) — this only covers rooms, not a general "feature a post"/site-wide content-curation tool, which still doesn't exist | `community_rooms`, migration 024 | `RoomMembersPanel.tsx`, `CreateRoomDialog.tsx` | No | No | A general content-curation admin surface, if ever wanted, is still unbuilt — room moderation itself is done |
| Award administration | A | See Awards section — period creation/status transitions/nomination review/winner determination are all real, gated to award_manager or super_admin (migration 035, and 038's follow-up fix) | Award tables | `AwardPeriodAdminPanel.tsx` (inside `/awards`, not a separate `/admin` sub-page) | No | No | None |
| Gamification administration | E | No way to adjust points/levels/badges as an admin | `point_events.event_type` includes `admin_adjustment`, reachable only via direct SQL today | None | No | No | Build an admin points-adjustment UI |

---

## Landing page content audit (Section 10)

| Component | What it shows | Real or fictional? |
|---|---|---|
| `MatchdayPreview.tsx` | Next real Man Utd fixture, or an honest "no upcoming fixture" empty state | **Real, database-driven** — reuses the same `fetchUpcomingMatches()` as `/matches`, correctly empty today because `matches=0` |
| `RankingsPreview.tsx` | Real `fetchFanLeaderboard()` data, or an honest "just getting started" empty state | **Fixed in Phase 15** — real, database-driven, re-verified in Phase 16 |
| `FanOfMonthPreview.tsx` | Honest "Coming soon" state (Awards/voting genuinely isn't built yet — see the AWARDS section above) | **Fixed in Phase 15** — no fabricated winner, matches the Dashboard's own teaser |
| `CommunityPreview.tsx` | Real `fetchFeedPage()` posts, or an honest "be the first to post" empty state | **Fixed in Phase 15** — real, database-driven, re-verified in Phase 16 |

All three were re-confirmed still in this fixed state during both Phase 16 and Phase 17 — no regression.
