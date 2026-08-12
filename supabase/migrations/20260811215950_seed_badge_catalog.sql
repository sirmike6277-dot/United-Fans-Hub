-- Seeds the badge catalog (migration 007 created `badges`/`user_badges` but
-- deliberately left them empty — "populated only by a future scheduled job").
-- This is that catalog: the six achievements shown in the approved reference
-- designs (Phase "Achievements/Badges" page, previously entirely unbuilt).
--
-- No `user_badges` rows are inserted here — awarding remains super_admin-only
-- per migration 007's RLS, and no automated awarding job exists yet. The
-- /achievements page instead evaluates each badge's `criteria` against a
-- fan's own real, already-queryable stats (predictions, posts, comments,
-- tenure) at render time — real numbers, honestly labelled, never a
-- fabricated "earned" claim written to the database.
--
-- `criteria.type` values and what the app currently knows how to evaluate:
--   predictions_correct   — derivePredictionStats().correctPredictions (live)
--   comments_count        — count of this profile's published comments (live)
--   posts_count           — count of this profile's published posts (live)
--   member_tenure_years   — profiles.created_at age (live)
--   streak_days           — not tracked anywhere yet (shown as "coming soon")
--   reactions_received    — not tracked anywhere yet (shown as "coming soon")
insert into public.badges (key, name, description, criteria) values
  ('match_predictor', 'Match Predictor', '10 correct match predictions', '{"type": "predictions_correct", "threshold": 10}'),
  ('top_commenter', 'Top Commenter', '100 comments posted', '{"type": "comments_count", "threshold": 100}'),
  ('on_a_streak', 'On A Streak', '7-day active streak', '{"type": "streak_days", "threshold": 7}'),
  ('content_creator', 'Content Creator', '50 posts shared', '{"type": "posts_count", "threshold": 50}'),
  ('united_loyal', 'United Loyal', '1 year member', '{"type": "member_tenure_years", "threshold": 1}'),
  ('community_hero', 'Community Hero', '1,000 reactions earned', '{"type": "reactions_received", "threshold": 1000}')
on conflict (key) do nothing;
