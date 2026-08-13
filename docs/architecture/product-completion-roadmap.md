# Product Completion Roadmap

Companion to `product-feature-completion-matrix.md` (read that first — this document sequences the work it identified into complete, testable user loops, not isolated screens).

**Status update — Phase 17 (2026-08-12):** Phase D (below) is now complete — Follow/Mentions/Threaded-replies all shipped in Phase 13, and Fan Rooms (a separate, later addition not foreseen when this roadmap was first written) now has its own complete interaction loop: join → read → send → react → reply → share media → poll → get notified → deep-link back. See the bottom of this document for what Phase 17 specifically closed and what remains genuinely open in that loop.

**Principle carried through every phase below**: a phase is not "done" when a table has rows or a button exists — it's done when a real user (or, where noted, a real single test account exercising every side, since this project has no second production account) can walk the *entire* loop and land in a state that matches what the UI claims.

---

## PHASE A — Unblock the Match/Prediction loop's real data source

This is listed first because Predictions, the leaderboard, and half of the new Dashboard are all currently starved by the same single external blocker — nothing else in this roadmap should be sequenced ahead of it, because nothing else is blocked by anything as simple as a subscription tier.

**Loop:**
```
API-Football plan covers the live season
  → syncFixtures() populates matches (already proven correct)
  → Match Centre shows real fixtures
  → maybeSyncSquad() gets a real trigger point (currently only fires from a match-detail page that can't render without a match)
  → Predictions form has a real player pool
  → user predicts → locks at kickoff → match finishes → settle_prediction() awards points (already proven correct)
  → leaderboard/rank updates (already proven correct)
```
**What's genuinely new work**: none of the sync/settlement code — it's already built and proven with real historical data. The only two real gaps: (1) the API plan itself (an account/billing decision, not code), and (2) giving squad sync an independent trigger (e.g. call `maybeSyncSquad` from the Predictions page itself, not only the match-detail page) so the player pool isn't hostage to a match existing first.
**Depends on**: nothing.
**Blocks**: Predictions, Match Centre, half the Dashboard, and therefore most of the product's "is this alive" impression.

---

## PHASE B — Complete the gamification loop (decide, then wire, real point sources)

```
User performs a real action (post / comment / reaction / follow)
  → a point_events row is inserted (currently: NEVER — verified live, zero triggers or client code do this for any community action)
  → sync_fan_points() updates the cached total (already correct, already fires — just never fed)
  → sync_fan_level() re-evaluates level (already correct — but only one level exists, so this never changes anything)
  → UI reflects the new total/level (already correct, wherever fan_points/fan_level are shown)
  → leaderboard re-ranks (already correct)
```
**What's genuinely new work**:
1. **Product decision** (not code): which actions should award points, and how many? Predictions already has an approved scale (3/5/3). Community actions have never had one approved — do not invent this; it needs the same explicit sign-off predictions scoring got.
2. Once approved: either a small `AFTER INSERT` trigger on `posts`/`comments`/`post_reactions` (mirroring the existing `notify_on_*` pattern exactly) or equivalent application-level inserts — whichever is decided, it's a small, mechanical addition to an already-proven pattern, not new architecture.
3. **Seed a real `fan_levels` ladder.** This alone is a schema *data* change (insert-only, zero risk to existing rows), not a schema *structure* change, and unblocks "Progression" the moment it's approved. This was already flagged as outstanding after Phase 9.
**Depends on**: nothing technical. Depends on a product decision on point values.
**Blocks**: Badges/Achievements (which need real point/action history to have criteria to check against), a meaningful "Progression" UI.

---

## PHASE C — Complete the Awards loop

```
Admin creates an award period (currently: no admin surface exists at all)
  → nominations open (RLS/schema ready, zero UI)
  → users nominate (zero UI)
  → eligibility enforced (schema-level checks already exist and were previously verified correct)
  → voting opens (zero UI)
  → one-vote-per-user/window rule enforced (already verified correct at the RLS level in the original pre-UI audit — do not re-derive this from scratch, re-verify it still holds)
  → voting closes (needs a close mechanism — admin action or scheduled)
  → winner determined (no logic exists for this yet — needs a decision on tie-breaking, at minimum)
  → winner displayed (Dashboard's placeholder card is the ready-made real estate)
  → notification generated (`award_winners`/`voting_open`/`award_nomination` types are already reserved in the notifications CHECK constraint, just never produced)
```
**What's genuinely new work**: essentially the entire user-facing and admin-facing surface — this is the largest single gap in the product relative to how much schema already exists for it. The RLS/eligibility logic is the one part that's already proven; everything else (nomination form, voting UI, period management, winner-determination logic, display) is new.
**Depends on**: Phase B's fan-points decision is a reasonable prerequisite if "eligibility" should ever consider engagement — not a hard blocker, but worth deciding in the same conversation.
**Blocks**: nothing else in the product depends on Awards.
**Status: DONE (Phase 18).** Full loop built at `/awards`: period creation/status flow, nomination + moderator approval, one-vote-per-user voting (self-vote and self-nomination both blocked), `determine_award_winner()` (highest-votes-wins, ties broken by earliest nomination), winner reveal (both on `/awards` and the Dashboard teaser), winners history archive. Two real pre-existing RLS gaps were found and fixed during testing (not merely inspected): `award_manager`-gated policies never let a `super_admin` through (unlike every other role-gated feature in the app), and — found only by live RLS testing, not by reading the policy — `award_nominations`' SELECT policy missing `super_admin` silently blocked even a permitted UPDATE, since Postgres RLS requires a row to be visible under SELECT before an UPDATE policy is ever consulted. Notification types for awards (`award_nomination`/`voting_open`) remain declared-but-unproduced — no trigger fires them yet; genuinely deferred, not fabricated.

---

## PHASE D — Complete the social graph (Follow, Mentions, Threaded replies)

```
User follows another user
  → follows row inserted (schema + notify trigger ready, zero UI)
  → notification generated (ready, unreachable)
  → (optional, product decision) feed could later prioritize followed users — not currently how the feed works, and should not be assumed as a requirement

User @mentions someone in a post/comment
  → mentions row inserted (schema + notify trigger ready)
  → notification generated
  → mention renders as a link in the post/comment body

User replies to a specific comment
  → comment inserted with parent_comment_id set (column + immutability trigger already exist)
  → UI nests/indicates the reply relationship
```
**What's genuinely new work**: three independent, small, well-scoped UI features, each sitting on schema and trigger infrastructure that's already correct and already tested (the notify triggers were live-verified working in the very first security audit, before any UI existed). This is the best "quick win" cluster in the whole roadmap — real user value, zero backend risk, nothing new to design at the data layer.
**Depends on**: nothing.
**Blocks**: nothing else, but meaningfully improves how "alive" Community feels.
**Status: DONE (Phase 13).** All three shipped — Follow/unfollow, `@mention` parsing+autocomplete+rendering in posts/comments, one-level comment replies.

---

## PHASE E — Complete the safety loop (Report, Block, Mute, Moderation queue)

```
User reports a post/comment/profile
  → reports row inserted (schema ready, zero UI)
  → appears in a moderation queue (no queue exists)
  → moderator resolves it via record_moderation_action() (function correct and tested, unreachable)
  → moderation_actions row recorded (immutable even to moderators — already verified)
  → reporter/affected user notified (declared type ready, unreachable)

User blocks/mutes another user
  → user_blocks/user_mutes row inserted (schema ready, zero UI)
  → blocked user's content is filtered from the blocker's feed/messages (no filtering logic exists anywhwere yet — this is new query-level work, not just a new table)
```
**What's genuinely new work**: report action + form, a moderator-only queue page (the product's first admin-role UI — mirrors the existing `has_role('match_manager'/'super_admin')` pattern already proven in the manual match-sync route), and — the part with no existing precedent at all — actually filtering blocked/muted users out of feeds and message lists, which touches the read side of `posts`/`comments`/`conversations` queries, not just a new write path.
**Depends on**: nothing technical.
**Blocks**: nothing else, but this is the product's only real content-safety mechanism, and it's currently 100% inert. Priority should track real user volume, not code complexity.
**Status: DONE (Safety Loop phase).** Report (`<ReportDialog>`, reused across messages/profiles/rooms), full mutual Block (DMs blocked both directions including into pre-existing DMs, Fan Room message visibility hidden both directions, mentions blocked both ways), silent one-directional Mute (Fan Room messages only — feed/notification filtering for posts and notifications was NOT extended this phase, a disclosed scope limit, not an oversight), and a real moderation queue at `/moderation` (dismiss/warn/remove-content/suspend, every action logged via `record_moderation_action()`). "Suspend" reuses the existing Fan Room ban mechanism (room-scoped, not a new global account-suspension concept — confirmed with the user before building). Two genuine, pre-existing bugs were found and fixed via live testing, not just this phase's own new code: (1) `award`-style role gates weren't the issue here, but (2) the `conversation_participants` "creator can add a second DM participant" policy branch used a raw inline subquery against `conversations` that's blocked by that table's own SELECT RLS immediately after a new conversation is created (before any participant exists to satisfy it) — fixed by switching to the existing `is_conversation_creator()` SECURITY DEFINER helper, and `createDirectMessage()` was changed from one multi-row participant insert to two sequential single-row inserts (a multi-row insert evaluates every row against one statement-start snapshot, so the second row's checks couldn't see effects the first row's insert would otherwise have made visible).

---

## PHASE F — First real admin surface

Everything above that says "no admin UI exists" funnels into one decision: does this product get a real `/admin` area now, or does each phase above keep deferring "who operates this"?

```
A user with super_admin (granted how? — user_roles currently has RLS enabled with zero policies, meaning nobody, not even a super_admin, can grant a role through the API today)
  → signs in
  → sees an admin-gated area (has_role() pattern already proven)
  → can resolve reports (Phase E)
  → can manage award periods (Phase C)
  → can adjust points/badges (Phase B)
```
**What's genuinely new work**: the first `/admin` route in the product, plus — a real, currently-undocumented gap this audit surfaced — **there is no way for anyone to grant a role to anyone today**, since `user_roles` has no policies at all. That has to be solved (even if only "the project owner runs one SQL statement once") before any admin-gated feature above can be exercised by a real person rather than a service-role SQL query.
**Depends on**: Phases B/C/E existing to have something to administer.
**Blocks**: real operability of everything gamification/awards/moderation build going forward.

---

## Sequencing summary

| Phase | Why here | Depends on |
|---|---|---|
| A — Unblock Match/Prediction data | Nothing else is blocked by something this simple (a plan tier); unblocks the most visible "is this real" surfaces | Nothing |
| B — Gamification loop | Small, mechanical, high visibility, needed before Badges/Progression mean anything | A product decision on point values |
| D — Social graph (Follow/Mentions/Replies) | Best value-to-risk ratio in the roadmap; schema/triggers already proven | Nothing |
| E — Safety loop (Report/Block/Mute/Moderation) | Should track real user volume; the longer real users exist without it, the more this matters | Nothing technical |
| C — Awards loop | Largest single build; genuinely optional to launch without | B (soft) |
| F — Admin surface | Only becomes urgent once B/C/E exist to administer | B, C, E |

This ordering is about **loop completeness and dependency**, not implementation convenience — Phase D is sequenced ahead of the larger Phase C specifically because it delivers real, working user-facing functionality on infrastructure that's already fully built and tested, while Phase C requires building nearly everything from zero.

---

## PHASE G (Phase 17) — Fan Room engagement & real-time interaction — DONE, with disclosed limitations

Fan Rooms (built in Phase 14, after this roadmap's original phases A–F were written) got its own complete interaction loop:

```
JOIN ROOM → READ CONVERSATION → SEND MESSAGE → REACT → REPLY → SHARE MEDIA
  → PARTICIPATE IN POLLS → RECEIVE NOTIFICATIONS → RETURN TO THE RELEVANT CONVERSATION
```

**What was already done before Phase 17** (Master Product Completion Phase): the reactions/replies/polls/mentions-in-messages schema, RLS, and base UI all existed already — Phase 17's job was mostly to harden, extend, and connect what was there, not build it from zero.

**What Phase 17 itself added**:
- A real security fix: poll creation was previously open to any room member; migration 034 restricts it to moderators/admins, matching this phase's explicit brief (the UI's "New poll" button is now hidden from non-moderators too).
- Realtime extended to `message_reactions` and `room_polls` (migration 033) — reactions and new polls now push to open rooms without a refresh.
- Notification deep-linking: a reply/mention on a Fan Room message now navigates to `/community/rooms/[roomId]?message=[messageId]` and the room scrolls to/highlights that exact message (`fetchMessagesAround()`, `RoomChat`'s `jumpToMessage()`) instead of just opening the room at its live tail.
- Room chat UX: a "Jump to latest"/new-message-count pill, scroll position preserved when loading older history (previously always snapped to bottom), click-to-locate on a reply's quoted preview.

**Disclosed, deliberate limitation — poll vote totals aren't push-realtime.** `room_poll_votes`' own RLS only lets a viewer see their *own* vote row (aggregate counts are only ever exposed through `room_poll_results()`, a function, which Realtime cannot subscribe to). Weakening that RLS to make live vote totals possible was explicitly out of scope. `RoomPollsPanel` substitutes a quiet 15-second periodic re-fetch while open — not true push-realtime, but delivers the same "don't need a hard refresh" outcome for a poll that's actually being watched.

**Depends on**: Phase D (mentions-in-messages needed the same `mentions` table widened in the Master Completion Phase) and Fan Rooms existing at all (Phase 14).
**Blocks**: nothing else in this roadmap.
