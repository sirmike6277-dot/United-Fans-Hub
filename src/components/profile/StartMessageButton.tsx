"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { MessageBubbleIcon } from "@/components/messaging/MessagingIcons";
import { findExistingDirectMessage, createDirectMessage } from "@/lib/messaging/conversations";

export interface StartMessageButtonProps {
  currentUserId: string;
  targetProfileId: string;
}

/**
 * "Message" action on another member's public profile. Never bypasses the
 * existing messaging authorization model: it only calls the two unmodified
 * data-layer functions (findExistingDirectMessage, createDirectMessage),
 * which are themselves bound by the existing RLS policies.
 *
 * This component is only ever rendered on someone else's profile (the route
 * redirects a viewer's own id to /profile, which renders "Edit Profile"
 * instead) — the id check below is defense in depth, not the primary guard,
 * and mirrors the same self-DM protection the (conversation_id, profile_id)
 * primary key already enforces server-side.
 */
export function StartMessageButton({ currentUserId, targetProfileId }: StartMessageButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUserId === targetProfileId) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { conversationId: existingId, error: lookupError } = await findExistingDirectMessage(supabase, {
      currentUserId,
      otherProfileId: targetProfileId,
    });

    if (lookupError) {
      setLoading(false);
      setError(lookupError);
      return;
    }

    if (existingId) {
      router.push(`/messages/${existingId}`);
      return;
    }

    const { conversationId, error: createError } = await createDirectMessage(supabase, {
      currentUserId,
      otherProfileId: targetProfileId,
    });

    if (createError || !conversationId) {
      setLoading(false);
      setError(createError ?? "Couldn't start the conversation. Please try again.");
      return;
    }

    router.push(`/messages/${conversationId}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={handleClick} loading={loading} disabled={loading}>
        <MessageBubbleIcon size={16} />
        {loading ? "Starting..." : "Message"}
      </Button>
      {error ? <span className="text-xs text-red-hover">{error}</span> : null}
    </div>
  );
}
