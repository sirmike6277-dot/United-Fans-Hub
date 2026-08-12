-- Adds a real category to posts, powering the Community feed's category
-- tabs (All Posts/Following/Matchday/Transfers/General) from the approved
-- reference design — previously posts had no way to be filtered by topic
-- at all. Defaults every existing and future uncategorized post to
-- 'general' rather than leaving it null, so every post always has a real,
-- displayable category.
alter table public.posts
  add column category text not null default 'general'
  check (category in ('matchday', 'transfers', 'general'));

create index idx_posts_category on public.posts(category);
