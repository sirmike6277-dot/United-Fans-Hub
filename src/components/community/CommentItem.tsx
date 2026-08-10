"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { HeartIcon } from "./CommunityIcons";
import { formatRelativeTime } from "@/lib/format";
import type { FeedComment } from "@/lib/community/comments";

export interface CommentItemProps {
  comment: FeedComment;
  currentUserId: string;
}

export function CommentItem({ comment, currentUserId }: CommentItemProps) {
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
      <Avatar url={comment.author.avatar_url} name={name} size={32} />
      <div className="flex-1">
        <div className="rounded-card bg-bg-elevated px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-sm font-semibold text-white">{name}</span>
            <span className="text-xs text-text-muted">@{comment.author.username}</span>
            <Badge tone="outline" className="!px-1.5 !py-0 text-[10px]">
              Lvl {comment.author.fan_level}
            </Badge>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text-body">{comment.body}</p>
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
              reacted ? "text-red-primary" : "text-text-muted hover:text-white"
            }`}
          >
            <HeartIcon filled={reacted} />
            {count > 0 ? <span>{count}</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
