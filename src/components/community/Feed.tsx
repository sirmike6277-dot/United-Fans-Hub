"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchFeedPage, POSTS_PAGE_SIZE, type FeedPost } from "@/lib/community/posts";
import { PostComposer } from "./PostComposer";
import { PostCard, type CurrentUser } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";
import { RefreshIcon } from "./CommunityIcons";
import { Button } from "@/components/ui/Button";

export interface FeedProps {
  currentUser: CurrentUser;
  clubId: string;
  initialPosts: FeedPost[];
  initialError: string | null;
  initialHasMore: boolean;
}

export function Feed({ currentUser, clubId, initialPosts, initialError, initialHasMore }: FeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const supabase = createClient();
    const from = posts.length;
    const { posts: nextPosts, error } = await fetchFeedPage(supabase, {
      from,
      to: from + POSTS_PAGE_SIZE - 1,
      currentUserId: currentUser.id,
    });

    setLoadingMore(false);

    if (error) {
      setLoadMoreError(error);
      return;
    }

    setPosts((prev) => [...prev, ...nextPosts]);
    setHasMore(nextPosts.length === POSTS_PAGE_SIZE);
  }

  function handlePostCreated(post: FeedPost) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <PostComposer currentUser={currentUser} clubId={clubId} onPostCreated={handlePostCreated} />

      {initialError ? (
        <div className="rounded-card border border-white/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
          {initialError}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-card border border-white/10 bg-bg-surface p-10 text-center">
          <p className="font-display text-lg font-semibold text-white">No posts yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Be the first to share something with the community.
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} />
          ))}

          {loadingMore ? (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          ) : null}

          {loadMoreError ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <p className="text-sm text-text-muted">{loadMoreError}</p>
              <Button variant="secondary" size="sm" onClick={loadMore}>
                <RefreshIcon />
                Try again
              </Button>
            </div>
          ) : hasMore ? (
            <div className="flex justify-center py-2">
              <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-text-muted">
              You&apos;re all caught up.
            </p>
          )}
        </>
      )}
    </div>
  );
}
