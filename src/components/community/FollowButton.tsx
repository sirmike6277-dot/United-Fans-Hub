"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { followProfile, unfollowProfile } from "@/lib/community/follows";

export interface FollowButtonProps {
  currentUserId: string;
  targetProfileId: string;
  initialIsFollowing: boolean;
  size?: "sm" | "md";
  onFollowChange?: (isFollowing: boolean) => void;
}

/**
 * Follow/Unfollow toggle — used on another member's profile (ProfileView's
 * action slot, alongside StartMessageButton) and on member directory cards.
 * Never bypasses the existing authorization model: it only calls the two
 * unmodified follows.ts data-layer functions, themselves bound by the
 * existing RLS + follows_check/primary-key constraints.
 *
 * Renders nothing on your own identity (mirrors StartMessageButton) — the
 * id check is defense in depth, not the primary guard; the database's own
 * CHECK (follower_id <> following_id) is what actually makes self-follow
 * impossible.
 */
export function FollowButton({
  currentUserId,
  targetProfileId,
  initialIsFollowing,
  size = "sm",
  onFollowChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUserId === targetProfileId) return null;

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const next = !isFollowing;

    const { error: actionError } = next
      ? await followProfile(supabase, { currentUserId, targetProfileId })
      : await unfollowProfile(supabase, { currentUserId, targetProfileId });

    setPending(false);

    if (actionError) {
      setError(actionError);
      return;
    }

    setIsFollowing(next);
    onFollowChange?.(next);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={isFollowing ? "secondary" : "primary"}
        size={size}
        onClick={handleClick}
        loading={pending}
        disabled={pending}
        aria-pressed={isFollowing}
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
      {error ? <span className="text-xs text-red-hover">{error}</span> : null}
    </div>
  );
}
