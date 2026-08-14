"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, crownFor } from "@/components/ui/Avatar";
import { FanLevelBadge } from "@/components/ui/FanLevelBadge";
import { HeartIcon, ReplyIcon } from "./CommunityIcons";
import { MentionText } from "./MentionText";
import { formatRelativeTime } from "@/lib/format";
import type { FeedComment } from "@/lib/community/comments";

export interface CommentItemProps {
  comment: FeedComment;
  currentUserId: string;
  onReply: (commentId: string, authorName: string, authorUsername: string) => void;
  /** True for a reply rendered inside its parent's thread — trims indent/size so nesting doesn't compound and disables further replies (this app renders one level deep). */
  isReply?: boolean;
}

export function CommentItem({ comment, currentUserId, onReply, isReply = false }: CommentItemProps) {
  const [reacted, setReacted] = useState(comment.hasReacted);
  const [count, setCount] = useState(comment.reactionCount);
  const [pending, setPending] = useState(false);

  const name = comment.author.display_name || comment.author.username;

  async function toggleReaction() {
    if (pending) return;
    setPending(true);
    const nextReacted = !reacted;
    setReacted(nextReacted);
    setCount((c) => Math.max(0, c + (nextReacted ? 1 : -1)));

    const supabase = createClient();
    const { error } = nextReacted
      ? await supabase.from("comment_reactions").insert({ comment_id: comment.id, user_id: currentUserId })
      : await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", comment.id)
          .eq("user_id", currentUserId);

    setPending(false);
    if (error) {
      setReacted(!nextReacted);
      setCount((c) => Math.max(0, c + (nextReacted ? -1 : 1)));
    }
  }

  return (
    <div className="flex gap-3">
      <Link href={`/profile/${comment.author.id}`} className="shrink-0">
        <Avatar url={comment.author.avatar_url} name={name} size={isReply ? 28 : 32} crown={crownFor(comment.author)} />
      </Link>
      <div className="flex-1">
        <div className="rounded-card bg-bg-elevated px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <Link href={`/profile/${comment.author.id}`} className="text-sm font-semibold text-ink hover:underline">
              {name}
            </Link>
            <Link href={`/profile/${comment.author.id}`} className="text-xs text-text-muted hover:underline">
              @{comment.author.username}
            </Link>
            <FanLevelBadge level={comment.author.fan_level} />
          </div>
          <MentionText
            text={comment.body}
            mentions={comment.mentions}
            className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text-body"
          />
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1 text-xs text-text-muted">
          <time dateTime={comment.createdAt} suppressHydrationWarning>
            {formatRelativeTime(comment.createdAt)}
          </time>
          <button
            type="button"
            onClick={toggleReaction}
            disabled={pending}
            aria-pressed={reacted}
            aria-label={reacted ? "Remove like" : "Like this comment"}
            className={`inline-flex h-8 min-w-[32px] items-center gap-1 rounded-control px-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary disabled:opacity-60 ${
              reacted ? "text-red-primary" : "text-text-muted hover:text-ink"
            }`}
          >
            <HeartIcon filled={reacted} />
            {count > 0 ? <span>{count}</span> : null}
          </button>
          {!isReply ? (
            <button
              type="button"
              onClick={() => onReply(comment.id, name, comment.author.username)}
              aria-label={`Reply to ${name}`}
              className="inline-flex h-8 min-w-[32px] items-center gap-1 rounded-control px-1.5 font-medium text-text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
            >
              <ReplyIcon />
              <span>Reply</span>
            </button>
          ) : null}
        </div>

        {comment.replies.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3 border-l border-ink/10 pl-4">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} onReply={onReply} isReply />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
