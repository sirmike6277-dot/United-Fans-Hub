"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { joinRoom, leaveRoom } from "@/lib/community/rooms";

export interface JoinRoomButtonProps {
  conversationId: string;
  currentUserId: string;
  initialIsMember: boolean;
  size?: "sm" | "md";
  /** After joining, navigate straight into the room — used on discovery cards. Leave omitted on the room's own header, where joining should just update the button in place. */
  navigateOnJoinHref?: string;
  onMemberChange?: (isMember: boolean) => void;
}

/**
 * Join/Leave toggle for a Fan Room — mirrors FollowButton's proven
 * optimistic-toggle shape exactly. The database is the real boundary here
 * (self-join/self-leave RLS + the ban-aware join policy from migration
 * 024); this component only calls the two unmodified rooms.ts functions.
 */
export function JoinRoomButton({
  conversationId,
  currentUserId,
  initialIsMember,
  size = "sm",
  navigateOnJoinHref,
  onMemberChange,
}: JoinRoomButtonProps) {
  const router = useRouter();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const next = !isMember;

    const { error: actionError } = next
      ? await joinRoom(supabase, { conversationId, currentUserId })
      : await leaveRoom(supabase, { conversationId, currentUserId });

    setPending(false);

    if (actionError) {
      setError(actionError);
      return;
    }

    setIsMember(next);
    onMemberChange?.(next);

    if (next && navigateOnJoinHref) {
      router.push(navigateOnJoinHref);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={isMember ? "secondary" : "primary"}
        size={size}
        onClick={handleClick}
        loading={pending}
        disabled={pending}
        aria-pressed={isMember}
      >
        {isMember ? "Joined" : "Join"}
      </Button>
      {error ? <span className="text-xs text-red-hover">{error}</span> : null}
    </div>
  );
}
