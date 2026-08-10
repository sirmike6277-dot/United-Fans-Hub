"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { CommentItem } from "./CommentItem";
import { SendIcon } from "./CommunityIcons";
import { fetchComments, type FeedComment } from "@/lib/community/comments";

export interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  currentUserAvatarUrl: string | null;
  currentUserName: string;
  currentUserUsername: string;
  currentUserFanLevel: number;
}

type LoadState = "idle" | "loading" | "loaded" | "error";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: currentUserId, body: trimmed })
      .select("id, body, created_at, author_id")
      .single();

    setSubmitting(false);

    if (error || !data) {
      setSubmitError("Couldn't post your comment. Please try again.");
      return;
    }

    setComments((prev) => [
      ...prev,
      {
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
        reactionCount: 0,
        hasReacted: false,
      },
    ]);
    setBody("");
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
            <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} />
          ))
        : null}

      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <Avatar url={currentUserAvatarUrl} name={currentUserName} size={32} />
        <div className="flex-1">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
              rows={1}
              maxLength={1000}
              placeholder="Add a comment..."
              aria-label="Add a comment"
              className="min-h-11 flex-1 resize-none rounded-control border border-white/10 bg-bg-elevated px-3 py-2.5 text-sm text-white placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              aria-label="Post comment"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-red-primary text-white transition-colors hover:bg-red-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
            >
              <SendIcon />
            </button>
          </div>
          {submitError ? <p className="mt-1 text-xs text-red-hover">{submitError}</p> : null}
        </div>
      </form>
    </div>
  );
}
