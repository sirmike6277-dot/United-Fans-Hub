"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, crownFor } from "@/components/ui/Avatar";
import { FanLevelBadge } from "@/components/ui/FanLevelBadge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContentActionsMenu } from "./ContentActionsMenu";
import { HeartIcon, ReplyIcon } from "./CommunityIcons";
import { MentionText } from "./MentionText";
import { formatRelativeTime } from "@/lib/format";
import { updateComment, deleteComment, type FeedComment } from "@/lib/community/comments";

export interface CommentItemProps {
  comment: FeedComment;
  currentUserId: string;
  onReply: (commentId: string, authorName: string, authorUsername: string) => void;
  /** True for a reply rendered inside its parent's thread — trims indent/size so nesting doesn't compound and disables further replies (this app renders one level deep). */
  isReply?: boolean;
}

export function CommentItem({ comment: initialComment, currentUserId, onReply, isReply = false }: CommentItemProps) {
  const [comment, setComment] = useState(initialComment);
  const [reacted, setReacted] = useState(comment.hasReacted);
  const [count, setCount] = useState(comment.reactionCount);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const name = comment.author.display_name || comment.author.username;
  const isOwn = comment.author.id === currentUserId;

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

  async function handleSaveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed === comment.body) {
      setEditing(false);
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const { error } = await updateComment({ commentId: comment.id, body: trimmed });
    setSavingEdit(false);
    if (error) {
      setEditError(error);
      return;
    }
    setComment((prev) => ({ ...prev, body: trimmed }));
    setEditing(false);
  }

  async function handleConfirmDelete(): Promise<string | null> {
    const { error } = await deleteComment({ commentId: comment.id });
    if (error) return error;
    setDeleted(true);
    return null;
  }

  if (deleted) {
    return (
      <div className="flex gap-3">
        <div className="w-8 shrink-0" aria-hidden="true" />
        <p className="rounded-card bg-bg-elevated px-3 py-2 text-xs italic text-text-muted">Comment deleted.</p>
      </div>
    );
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
            {isOwn ? (
              <span className="ml-auto">
                <ContentActionsMenu label="comment" onEdit={() => setEditing(true)} onDelete={() => setConfirmDeleteOpen(true)} />
              </span>
            ) : null}
          </div>
          {editing ? (
            <div className="mt-1.5 flex flex-col gap-2">
              {editError ? <p className="text-xs text-red-hover">{editError}</p> : null}
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={savingEdit}
                rows={2}
                autoFocus
                maxLength={1000}
                className="w-full resize-none rounded-control border border-ink/10 bg-bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={savingEdit}
                  onClick={() => {
                    setEditing(false);
                    setEditBody(comment.body);
                    setEditError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" loading={savingEdit} disabled={savingEdit || !editBody.trim()} onClick={handleSaveEdit}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <MentionText
              text={comment.body}
              mentions={comment.mentions}
              className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text-body"
            />
          )}
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
      {confirmDeleteOpen ? (
        <ConfirmDialog
          title="Delete comment?"
          message="This removes the comment for everyone. This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmDeleteOpen(false)}
        />
      ) : null}
    </div>
  );
}
