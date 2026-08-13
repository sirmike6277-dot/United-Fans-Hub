# Fan Points & Level Rules

Single source of truth for how `profiles.fan_points`/`fan_level` can change, written during the Master Product Completion Phase per that phase's explicit request to document the rules rather than leave them implicit in migration comments only.

## The ledger

`point_events` is the only place points are recorded. `profiles.fan_points` is a cached sum, kept in sync by the `sync_fan_points()` trigger; `profiles.fan_level` is recomputed from `fan_levels` by `sync_fan_level()` whenever `fan_points` changes. Neither cached column is ever written directly by application code, and neither is client-writable at the database level (see "Security" below) — `point_events` rows are the only real input.

## What currently awards points

**Only one thing:** a correctly-settled match prediction, via `settle_prediction()`.

| Event type | Points | Condition |
|---|---|---|
| `prediction_result_correct` | 3 | Predicted result (home win / draw / away win) matches the final result |
| `prediction_score_correct` | 5 | Predicted exact score matches the final score (additive with the above) |
| `prediction_scorer_correct` | 3 | Predicted first goalscorer matches the real first scorer |

`settle_prediction()` re-derives every one of these from real `matches`/`match_events` rows — it never trusts a client-supplied score. It is idempotent (`prediction_scores.UNIQUE(prediction_id)` + `ON CONFLICT DO NOTHING`), so re-running it for an already-settled prediction is a no-op.

`correct_ht_score` and `correct_motm` are reserved `event_type` values with no active rule — neither half-time scores nor an authoritative Man of the Match source exists yet.

## What does NOT award points (by deliberate decision, not oversight)

Posting, commenting, reacting, replying, mentioning, following, voting in a poll, and reacting to a message all award **zero** points today. This was flagged as an open product decision as far back as migration 007 and remains one: inventing a point value for these (e.g. "+1 for posting") would be a real business-rule decision with real anti-abuse implications (farming, self-interaction, reaction inflation), not a technical gap — so it hasn't been done speculatively.

If/when a community-engagement point source is approved, it should follow the exact same shape as predictions: a real `point_events.event_type`, a trigger or function that computes the value from real, hard-to-farm signals, and an explicit anti-abuse rule (e.g. capping same-day/same-target events) decided before it ships — not arbitrary "make the UI look active" points.

## The level ladder

`fan_levels` (seeded in migration 031):

| Level | Title | Min points |
|---|---|---|
| 1 | Fan | 0 |
| 2 | Regular | 25 |
| 3 | Supporter | 75 |
| 4 | Loyal Fan | 150 |
| 5 | Superfan | 300 |
| 6 | Legend | 500 |

Thresholds are calibrated against the only real point source above (a genuinely active predictor across a real season can reach the top tier) — not arbitrary.

## Security

- `point_events`: no client INSERT policy at all. Only `super_admin` (direct) or `settle_prediction()` (SECURITY DEFINER RPC, ownership-checked) can write to it.
- `profiles.fan_points`/`fan_level`: INSERT/UPDATE privilege on these two columns is revoked from `authenticated`/`anon` at the grant level (not just RLS) — a client cannot write them even via a crafted `profiles` update that also touches other, genuinely-editable fields.
- `fan_levels`/`badges`/`user_badges`: public read, `super_admin`-only write. No automated badge-awarding job exists yet — badges are evaluated live/read-only against real stats, never persisted as "earned" without an actual future awarding mechanism.
