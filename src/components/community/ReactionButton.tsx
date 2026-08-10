"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HeartIcon } from "./CommunityIcons";

export interface ReactionButtonProps {
  postId: string;
  userId: string;
  initialReacted: boolean;
  initialCount: number;
}

/**
 * Post "like" toggle backed by post_reactions. The DB already enforces one
 * reaction per user/post via a unique constraint and RLS (insert/delete as
 * self only) — this component does not attempt to reproduce that rule, it
 * only reflects it. Updates optimistically, then reconciles with the DB
 * response; reverts cleanly if the write fails (e.g. a race with another
 * tab, or a network error).
 */
export function ReactionButton({ postId, userId, initialReacted, initialCount }: ReactionButtonProps) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    if (pending) return;
    setFailed(false);
    setPending(true);

    const nextReacted = !reacted;
    setReacted(nextReacted);
    setCount((c) => Math.max(0, c + (nextReacted ? 1 : -1)));

    const supabase = createClient();
    const { error } = nextReacted
      ? await supabase.from("post_reactions").insert({ post_id: postId, user_id: userId })
      : await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", userId);

    setPending(false);

    if (error) {
      // Revert — the optimistic update didn't actually happen in the DB.
      setReacted(!nextReacted);
      setCount((c) => Math.max(0, c + (nextReacted ? -1 : 1)));
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={reacted}
        aria-label={reacted ? "Remove like" : "Like this post"}
        className={`inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary disabled:opacity-60 ${
          reacted ? "text-red-primary" : "text-text-muted hover:text-white"
        }`}
      >
        <HeartIcon filled={reacted} />
        <span>{count > 0 ? count.toLocaleString() : ""}</span>
      </button>
      {failed ? <span className="pl-2.5 text-xs text-red-hover">Couldn&apos;t update — try again</span> : null}
    </div>
  );
}
