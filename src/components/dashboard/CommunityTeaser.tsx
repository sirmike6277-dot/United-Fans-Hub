import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { formatRelativeTime } from "@/lib/format";
import type { FeedPost } from "@/lib/community/posts";

/**
 * Compact preview of the real feed's most recent posts — reuses the exact
 * FeedPost shape/data `fetchFeedPage` already returns (no second query
 * shape, no fabricated posts). There's no per-post detail route in this
 * app yet, so every entry links back to the full `/community` feed rather
 * than a dead/invented permalink.
 */
export function CommunityTeaser({ posts }: { posts: FeedPost[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold uppercase text-red-primary">Community Activity</h2>
        <Link href="/community" className="text-xs font-medium text-red-primary hover:text-red-hover">
          View all
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            No posts yet — be the first to share something with the community.
          </p>
        ) : (
          posts.map((post) => {
            const name = post.author.display_name || post.author.username;
            return (
              <Link
                key={post.id}
                href="/community"
                className="-mx-2 flex items-start gap-3 rounded-control p-2 transition-colors hover:bg-ink/5"
              >
                <Avatar url={post.author.avatar_url} name={name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-ink">{name}</span>
                    <time className="text-xs text-text-muted" suppressHydrationWarning>
                      {formatRelativeTime(post.createdAt)}
                    </time>
                  </div>
                  {post.body ? (
                    <p className="mt-0.5 truncate text-sm text-text-muted">{post.body}</p>
                  ) : (
                    <p className="mt-0.5 text-sm text-text-muted italic">Shared media</p>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
