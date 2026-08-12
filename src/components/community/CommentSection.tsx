"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { CommentItem } from "./CommentItem";
import { SendIcon, CloseIcon } from "./CommunityIcons";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { fetchComments, type FeedComment } from "@/lib/community/comments";
import {
  activeMentionQuery,
  applyMention,
  createMentions,
  extractMentionedUsernames,
  resolveMentionedProfiles,
  searchMentionCandidates,
} from "@/lib/community/mentions";
import type { FeedAuthor } from "@/lib/community/posts";

export interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  currentUserAvatarUrl: string | null;
  currentUserName: string;
  currentUserUsername: string;
  currentUserFanLevel: number;
}

type LoadState = "idle" | "loading" | "loaded" | "error";

interface ReplyTarget {
  commentId: string;
  authorName: string;
}

export function CommentSection({
  postId,
  currentUserId,
  currentUserAvatarUrl,
  currentUserName,
  currentUserUsername,
  currentUserFanLevel,
}: CommentSectionProps) {
  // Starts "loading" directly (rather than "idle" + a setState inside the
  // effect below) — this component only ever mounts once a post's comment
  // section is expanded, so it always needs to load immediately.
  const [state, setState] = useState<LoadState>("loading");
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<FeedAuthor[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    fetchComments(postId, currentUserId).then(({ comments: loaded, error }) => {
      if (!active) return;
      if (error) {
        setState("error");
        return;
      }
      setComments(loaded);
      setState("loaded");
    });
    return () => {
      active = false;
    };
    // Runs once when the section mounts (i.e. when the user expands it) — see PostCard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBodyChange(value: string, cursorPos: number) {
    setBody(value);
    const query = activeMentionQuery(value, cursorPos);
    if (query === null || query.length === 0) {
      setMentionCandidates([]);
      return;
    }

    const thisRequest = ++mentionRequestId.current;
    const candidates = await searchMentionCandidates(createClient(), { query, excludeId: currentUserId });
    if (thisRequest !== mentionRequestId.current) return;
    setMentionCandidates(candidates);
  }

  function selectMention(username: string) {
    const el = textareaRef.current;
    const cursorPos = el?.selectionStart ?? body.length;
    const { value, cursorPos: nextCursor } = applyMention(body, cursorPos, username);
    setBody(value);
    setMentionCandidates([]);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function startReply(commentId: string, authorName: string, authorUsername: string) {
    setReplyTo({ commentId, authorName });
    setBody(`@${authorUsername} `);
    setMentionCandidates([]);
    textareaRef.current?.focus();
  }

  function cancelReply() {
    setReplyTo(null);
    setBody("");
    setMentionCandidates([]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    const parentCommentId = replyTo?.commentId ?? null;

    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: currentUserId, body: trimmed, parent_comment_id: parentCommentId })
      .select("id, body, created_at, author_id")
      .single();

    if (error || !data) {
      setSubmitting(false);
      setSubmitError("Couldn't post your comment. Please try again.");
      return;
    }

    // Best-effort, mirrors PostComposer: mentions never block or roll back
    // the comment that's already been published.
    const mentionedUsernames = extractMentionedUsernames(trimmed);
    let mentionRefs: { id: string; username: string }[] = [];
    if (mentionedUsernames.length > 0) {
      const resolved = await resolveMentionedProfiles(supabase, mentionedUsernames);
      mentionRefs = resolved.filter((p) => p.id !== currentUserId);
      if (mentionRefs.length > 0) {
        await createMentions(supabase, {
          commentId: data.id,
          mentionedProfileIds: mentionRefs.map((m) => m.id),
        });
      }
    }

    const newComment: FeedComment = {
      id: data.id,
      body: data.body,
      createdAt: data.created_at,
      authorId: data.author_id,
      author: {
        id: currentUserId,
        username: currentUserUsername,
        display_name: currentUserName,
        avatar_url: currentUserAvatarUrl,
        fan_level: currentUserFanLevel,
      },
      parentCommentId,
      reactionCount: 0,
      hasReacted: false,
      mentions: mentionRefs,
      replies: [],
    };

    setSubmitting(false);
    setComments((prev) => {
      if (!parentCommentId) return [...prev, newComment];
      return prev.map((c) => (c.id === parentCommentId ? { ...c, replies: [...c.replies, newComment] } : c));
    });
    setBody("");
    setReplyTo(null);
    textareaRef.current?.focus();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
      {state === "loading" ? (
        <div className="flex flex-col gap-3" aria-live="polite" aria-label="Loading comments">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="h-10 flex-1 animate-pulse rounded-card bg-white/5" />
            </div>
          ))}
        </div>
      ) : null}

      {state === "error" ? (
        <p className="text-sm text-text-muted">Couldn&apos;t load comments right now.</p>
      ) : null}

      {state === "loaded" && comments.length === 0 ? (
        <p className="text-sm text-text-muted">No comments yet — start the conversation.</p>
      ) : null}

      {state === "loaded" || comments.length > 0
        ? comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} onReply={startReply} />
          ))
        : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {replyTo ? (
          <div className="flex items-center gap-2 pl-11 text-xs text-text-muted">
            <span>
              Replying to <span className="font-medium text-white">{replyTo.authorName}</span>
            </span>
            <button
              type="button"
              onClick={cancelReply}
              aria-label="Cancel reply"
              className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <Avatar url={currentUserAvatarUrl} name={currentUserName} size={32} />
          <div className="relative flex-1">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => handleBodyChange(e.target.value, e.target.selectionStart)}
                disabled={submitting}
                rows={1}
                maxLength={1000}
                placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : "Add a comment..."}
                aria-label={replyTo ? `Reply to ${replyTo.authorName}` : "Add a comment"}
                className="min-h-11 flex-1 resize-none rounded-control border border-white/10 bg-bg-elevated px-3 py-2.5 text-sm text-white placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (mentionCandidates.length > 0) {
                      selectMention(mentionCandidates[0].username);
                    } else {
                      handleSubmit(e);
                    }
                  } else if (e.key === "Escape" && mentionCandidates.length > 0) {
                    setMentionCandidates([]);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!body.trim() || submitting}
                aria-label={replyTo ? "Post reply" : "Post comment"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-red-primary text-white transition-colors hover:bg-red-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
              >
                <SendIcon />
              </button>
            </div>
            <MentionAutocomplete candidates={mentionCandidates} onSelect={selectMention} />
            {submitError ? <p className="mt-1 text-xs text-red-hover">{submitError}</p> : null}
          </div>
        </div>
      </form>
    </div>
  );
}
