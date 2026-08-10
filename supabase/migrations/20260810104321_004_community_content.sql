-- 004: community content (architecture proposal §C.3)
-- posts / post_media / comments / post_reactions / comment_reactions /
-- mentions / follows. Soft-delete via deleted_at; moderation via status.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid not null references public.clubs(id),
  body text,
  visibility text not null default 'public' check (visibility in ('public','followers')),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_posts_club_created on public.posts(club_id, created_at desc);
create index idx_posts_author on public.posts(author_id);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null check (media_type in ('image','video','file')),
  storage_path text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_post_media_post_id on public.post_media(post_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_comments_post_created on public.comments(post_id, created_at);
create index idx_comments_parent on public.comments(parent_comment_id);

create table public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like')),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  mentioned_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

create index idx_mentions_mentioned_profile on public.mentions(mentioned_profile_id);
create index idx_mentions_post on public.mentions(post_id);
create index idx_mentions_comment on public.mentions(comment_id);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index idx_follows_following on public.follows(following_id);

create trigger on_post_updated before update on public.posts
  for each row execute function public.handle_profile_updated_at();
create trigger on_comment_updated before update on public.comments
  for each row execute function public.handle_profile_updated_at();

alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.mentions enable row level security;
alter table public.follows enable row level security;

-- posts: public when published; owner can insert/update own; moderators can update any.
create policy "Published posts are publicly readable"
  on public.posts for select
  using (status = 'published');

create policy "Users can insert their own posts"
  on public.posts for insert
  with check ((select auth.uid()) = author_id);

create policy "Users can update their own posts"
  on public.posts for update
  using ((select auth.uid()) = author_id);

create policy "Moderators can update any post"
  on public.posts for update
  using (public.has_role('moderator'))
  with check (public.has_role('moderator'));

-- post_media: readable wherever the parent post is readable; owner-managed.
create policy "Post media readable with parent post"
  on public.post_media for select
  using (exists (select 1 from public.posts p where p.id = post_media.post_id and p.status = 'published'));

create policy "Owners can manage their post media"
  on public.post_media for all
  using (exists (select 1 from public.posts p where p.id = post_media.post_id and p.author_id = (select auth.uid())))
  with check (exists (select 1 from public.posts p where p.id = post_media.post_id and p.author_id = (select auth.uid())));

-- comments: same pattern as posts.
create policy "Published comments are publicly readable"
  on public.comments for select
  using (status = 'published');

create policy "Users can insert their own comments"
  on public.comments for insert
  with check ((select auth.uid()) = author_id);

create policy "Users can update their own comments"
  on public.comments for update
  using ((select auth.uid()) = author_id);

create policy "Moderators can update any comment"
  on public.comments for update
  using (public.has_role('moderator'))
  with check (public.has_role('moderator'));

-- reactions: public read, one per user per item enforced by unique constraint too.
create policy "Post reactions are publicly readable"
  on public.post_reactions for select
  using (true);

create policy "Users can react to posts as themselves"
  on public.post_reactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own post reactions"
  on public.post_reactions for delete
  using ((select auth.uid()) = user_id);

create policy "Comment reactions are publicly readable"
  on public.comment_reactions for select
  using (true);

create policy "Users can react to comments as themselves"
  on public.comment_reactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own comment reactions"
  on public.comment_reactions for delete
  using ((select auth.uid()) = user_id);

-- mentions: readable publicly (metadata on public content); only the
-- content's own author may create the mention row for it.
create policy "Mentions are publicly readable"
  on public.mentions for select
  using (true);

create policy "Authors can mention users in their own content"
  on public.mentions for insert
  with check (
    (post_id is not null and (select auth.uid()) = (select author_id from public.posts where id = post_id))
    or
    (comment_id is not null and (select auth.uid()) = (select author_id from public.comments where id = comment_id))
  );

-- follows: public read (follower/following counts), self-service create/remove.
create policy "Follows are publicly readable"
  on public.follows for select
  using (true);

create policy "Users can follow as themselves"
  on public.follows for insert
  with check ((select auth.uid()) = follower_id);

create policy "Users can unfollow as themselves"
  on public.follows for delete
  using ((select auth.uid()) = follower_id);
