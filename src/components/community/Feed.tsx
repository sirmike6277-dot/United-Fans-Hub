"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchFeedPage, POSTS_PAGE_SIZE, type FeedPost, type PostCategory } from "@/lib/community/posts";
import { fetchFollowingIds } from "@/lib/community/follows";
import { PostComposer } from "./PostComposer";
import { PostCard, type CurrentUser } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";
import { RefreshIcon } from "./CommunityIcons";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export interface FeedProps {
  currentUser: CurrentUser;
  clubId: string;
  initialPosts: FeedPost[];
  initialError: string | null;
  initialHasMore: boolean;
  /** True once the caller renders its own <h1> above this (see community/page.tsx's SectionBanner) — SectionBanner already carries the page's heading, so this never renders a second one. */
  hideHeader?: boolean;
}

type FeedTab = "all" | "following" | "matchday" | "transfers" | "general";

// Labels are deliberately distinct in *shape*, not just wording — "All"
// reads as the umbrella (every category, unfiltered) precisely because
// nothing after it narrows anything down, while every other tab (including
// "General Chat" — the catch-all *category* for posts that aren't
// specifically Matchday or Transfers) reads as one filtered slice of it.
// "All Posts" next to "General" previously looked like two words for the
// same thing; they never were.
const TABS: { key: FeedTab; label: string; category?: PostCategory }[] = [
  { key: "all", label: "All" },
  { key: "following", label: "Following" },
  { key: "matchday", label: "Matchday", category: "matchday" },
  { key: "transfers", label: "Transfers", category: "transfers" },
  { key: "general", label: "General Chat", category: "general" },
];

export function Feed({ currentUser, clubId, initialPosts, initialError, initialHasMore, hideHeader = false }: FeedProps) {
  const [tab, setTab] = useState<FeedTab>("all");
  const [posts, setPosts] = useState(initialPosts);
  const [error, setError] = useState(initialError);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[] | null>(null);

  async function fetchForTab(nextTab: FeedTab, from: number) {
    const supabase = createClient();
    const meta = TABS.find((t) => t.key === nextTab)!;

    let authorIds: string[] | undefined;
    if (nextTab === "following") {
      let ids = followingIds;
      if (ids === null) {
        ids = await fetchFollowingIds(supabase, currentUser.id);
        setFollowingIds(ids);
      }
      authorIds = ids;
    }

    return fetchFeedPage(supabase, {
      from,
      to: from + POSTS_PAGE_SIZE - 1,
      currentUserId: currentUser.id,
      category: meta.category,
      authorIds,
    });
  }

  async function switchTab(nextTab: FeedTab) {
    if (nextTab === tab) return;
    setTab(nextTab);

    if (nextTab === "all") {
      // The server-rendered first page is already the "All Posts" view —
      // no need to refetch what was already delivered on initial load.
      setPosts(initialPosts);
      setError(initialError);
      setHasMore(initialHasMore);
      return;
    }

    setLoading(true);
    setError(null);
    const { posts: nextPosts, error: fetchError } = await fetchForTab(nextTab, 0);
    setLoading(false);

    if (fetchError) {
      setError(fetchError);
      return;
    }
    setPosts(nextPosts);
    setHasMore(nextPosts.length === POSTS_PAGE_SIZE);
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const { posts: nextPosts, error: fetchError } = await fetchForTab(tab, posts.length);

    setLoadingMore(false);

    if (fetchError) {
      setLoadMoreError(fetchError);
      return;
    }

    setPosts((prev) => [...prev, ...nextPosts]);
    setHasMore(nextPosts.length === POSTS_PAGE_SIZE);
  }

  function handlePostCreated(post: FeedPost) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${hideHeader ? "pb-6 sm:pb-8" : "py-6 sm:py-8"}`}>
      {hideHeader ? null : (
        <PageHeader title="Community" subtitle="Where the Red Army talks — before, during, and long after full time." />
      )}
      <PostComposer currentUser={currentUser} clubId={clubId} onPostCreated={handlePostCreated} />

      <div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              aria-pressed={tab === t.key}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                tab === t.key ? "bg-red-primary text-white" : "bg-white/5 text-text-muted hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {tab === "all"
            ? "Every post, every category, newest first."
            : tab === "following"
              ? "Only posts from fans you follow."
              : tab === "general"
                ? "The catch-all category — posts that aren't specifically Matchday or Transfers."
                : `Posts tagged ${TABS.find((t) => t.key === tab)?.label}.`}
        </p>
      </div>

      {error ? (
        <div className="rounded-card border border-white/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
          {error}
        </div>
      ) : loading ? (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      ) : posts.length === 0 ? (
        <div className="rounded-card border border-white/10 bg-bg-surface p-10 text-center">
          <p className="font-display text-lg font-semibold text-white">
            {tab === "following" ? "No posts from fans you follow yet" : "No posts yet"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {tab === "following"
              ? "Follow more fans from Members to see their posts here."
              : "Be the first to share something with the community."}
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
