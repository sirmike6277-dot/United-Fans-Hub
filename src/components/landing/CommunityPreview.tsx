import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { FeedPost } from "@/lib/community/posts";

export interface CommunityPreviewProps {
  posts: FeedPost[];
}

/**
 * Was three hardcoded, fabricated posts (invented usernames, bodies, and
 * like/comment counts) presented as "what fans are posting right now" —
 * flagged in the Phase 12 audit, fixed here (Phase 15). Now reuses the same
 * fetchFeedPage() the real /community feed uses (posts are publicly
 * readable, so this works for a signed-out visitor too). An empty result
 * renders an honest "be the first" message instead of inventing activity.
 */
export function CommunityPreview({ posts }: CommunityPreviewProps) {
  return (
    <section id="community" className="bg-bg-void py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge tone="red">Community</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase text-white sm:text-4xl">
            The debate never stops
          </h2>
          <p className="mt-4 text-text-muted">A glimpse at what fans are posting right now.</p>
        </div>

        {posts.length === 0 ? (
          <Card className="mx-auto mt-12 max-w-md text-center text-sm text-text-muted">
            The community feed is just getting started — be the first to post.
          </Card>
        ) : (
          <div className="mt-12 flex flex-col gap-4">
            {posts.map((post) => {
              const name = post.author.display_name || post.author.username;
              return (
                <Card key={post.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar url={post.author.avatar_url} name={name} size={36} />
                    <div>
                      <p className="text-sm font-semibold text-white">{name}</p>
                      <p className="text-xs text-text-muted">@{post.author.username}</p>
                    </div>
                  </div>
                  {post.body ? <p className="text-sm text-text-body">{post.body}</p> : null}
                  <div className="flex gap-4 text-xs text-text-muted">
                    <span>♥ {post.reactionCount}</span>
                    <span>💬 {post.commentCount}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
