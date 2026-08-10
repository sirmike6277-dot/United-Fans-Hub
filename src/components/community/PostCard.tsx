"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRelativeTime } from "@/lib/format";
import { PostMedia } from "./PostMedia";
import { ReactionButton } from "./ReactionButton";
import { CommentSection } from "./CommentSection";
import { CommentIcon } from "./CommunityIcons";
import type { FeedPost } from "@/lib/community/posts";

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  fanLevel: number;
}

export interface PostCardProps {
  post: FeedPost;
  currentUser: CurrentUser;
}

export function PostCard({ post, currentUser }: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const authorName = post.author.display_name || post.author.username;

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <Avatar url={post.author.avatar_url} name={authorName} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-display font-semibold text-white">{authorName}</span>
            <span className="text-sm text-text-muted">@{post.author.username}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
            <Badge tone="outline" className="!px-1.5 !py-0 text-[10px]">
              Level {post.author.fan_level}
            </Badge>
            {/* suppressHydrationWarning: relative time legitimately differs between
                server render and client hydration as real time elapses between
                them — this is Next.js's documented pattern for that case, not a
                workaround for an actual bug. */}
            <time dateTime={post.createdAt} suppressHydrationWarning>
              {formatRelativeTime(post.createdAt)}
            </time>
          </div>
        </div>
      </div>

      {post.body ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-body sm:text-base">
          {post.body}
        </p>
      ) : null}

      <PostMedia media={post.media} />

      <div className="mt-3 flex items-center gap-1 border-t border-white/10 pt-2">
        <ReactionButton
          postId={post.id}
          userId={currentUser.id}
          initialReacted={post.hasReacted}
          initialCount={post.reactionCount}
        />
        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          aria-expanded={commentsOpen}
          aria-label={commentsOpen ? "Hide comments" : "Show comments"}
          className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
        >
          <CommentIcon />
          <span>{post.commentCount > 0 ? post.commentCount.toLocaleString() : "Comment"}</span>
        </button>
      </div>

      {commentsOpen ? (
        <CommentSection
          postId={post.id}
          currentUserId={currentUser.id}
          currentUserAvatarUrl={currentUser.avatarUrl}
          currentUserName={currentUser.displayName}
          currentUserUsername={currentUser.username}
          currentUserFanLevel={currentUser.fanLevel}
        />
      ) : null}
    </Card>
  );
}
