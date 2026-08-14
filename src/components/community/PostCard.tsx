"use client";

import { useState } from "react";
import { Avatar, crownFor } from "@/components/ui/Avatar";
import { FanLevelBadge } from "@/components/ui/FanLevelBadge";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Card } from "@/components/ui/Card";
import { formatRelativeTime } from "@/lib/format";
import { PostMedia } from "./PostMedia";
import { ReactionButton } from "./ReactionButton";
import { CommentSection } from "./CommentSection";
import { ShareMenu } from "./ShareMenu";
import { CommentIcon } from "./CommunityIcons";
import { MentionText } from "./MentionText";
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
  /** Forces the comment thread open and hides the toggle — used on the post's own permalink page (/community/[postId]), where showing the thread is the whole point of the page rather than a click away. */
  forceCommentsOpen?: boolean;
  /** Hides the "Share" link — used on the permalink page itself, which has nowhere further to link to. */
  hideShare?: boolean;
}

export function PostCard({ post, currentUser, forceCommentsOpen = false, hideShare = false }: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(forceCommentsOpen);
  const authorName = post.author.display_name || post.author.username;

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <Avatar url={post.author.avatar_url} name={authorName} size={44} crown={crownFor(post.author)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-display font-semibold text-ink">{authorName}</span>
            <span className="text-sm text-text-muted">@{post.author.username}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
            <FanLevelBadge level={post.author.fan_level} />
            <RoleBadge profileId={post.author.id} />
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
        <MentionText
          text={post.body}
          mentions={post.mentions}
          className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-body sm:text-base"
        />
      ) : null}

      <PostMedia media={post.media} />

      <div className="mt-3 flex items-center gap-1 border-t border-ink/10 pt-2">
        <ReactionButton
          postId={post.id}
          userId={currentUser.id}
          initialReacted={post.hasReacted}
          initialCount={post.reactionCount}
        />
        {forceCommentsOpen ? (
          <span className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-text-muted">
            <CommentIcon />
            <span>{post.commentCount > 0 ? post.commentCount.toLocaleString() : "Comment"}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            aria-expanded={commentsOpen}
            aria-label={commentsOpen ? "Hide comments" : "Show comments"}
            className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
          >
            <CommentIcon />
            <span>{post.commentCount > 0 ? post.commentCount.toLocaleString() : "Comment"}</span>
          </button>
        )}
        {hideShare ? null : <ShareMenu postId={post.id} shareText={post.body ? `${authorName}: ${post.body}` : undefined} />}
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
