import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PostCard } from "@/components/community/PostCard";
import { fetchPostById } from "@/lib/community/posts";

export const metadata: Metadata = {
  title: "Post — United Fans Hub",
};

function BackIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

/**
 * The permalink page the reference design's "Post Detail / Comments" panel
 * calls for — previously nonexistent (CommunityTeaser's own comment noted
 * "there's no per-post detail route in this app yet"). Reuses PostCard as-is
 * (already has media, reactions, a comment thread) rather than a second,
 * subtly different implementation — this page's job is just to fetch one
 * real post and force its thread open.
 */
export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/login");

  const { post, error } = await fetchPostById(supabase, { postId, currentUserId: userId });

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex max-w-2xl flex-col gap-4 py-6 sm:py-8">
          <Link
            href="/community"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-white"
          >
            <BackIcon /> Back
          </Link>

          {error ? (
            <div className="rounded-card border border-white/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
              {error}
            </div>
          ) : !post ? (
            <div className="rounded-card border border-white/10 bg-bg-surface p-10 text-center">
              <p className="font-display text-lg font-semibold text-white">Post not found</p>
              <p className="mt-1 text-sm text-text-muted">
                It may have been removed, or the link is incorrect.
              </p>
            </div>
          ) : (
            <PostCard
              post={post}
              currentUser={{
                id: profile.id,
                username: profile.username,
                displayName: profile.display_name || profile.username,
                avatarUrl: profile.avatar_url,
                fanLevel: profile.fan_level,
              }}
              forceCommentsOpen
              hideShare
            />
          )}
        </div>
      </main>
    </AppShell>
  );
}
