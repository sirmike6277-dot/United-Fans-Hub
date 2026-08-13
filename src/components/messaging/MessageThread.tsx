"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { BackIcon, MessageBubbleIcon } from "./MessagingIcons";
import { RefreshIcon } from "@/components/community/CommunityIcons";
import { markConversationRead } from "@/lib/messaging/conversations";
import { fetchMessagesPage, MESSAGES_PAGE_SIZE, type FeedMessage } from "@/lib/messaging/messages";
import type { FeedAuthor } from "@/lib/community/posts";

export interface ThreadCurrentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  fanLevel: number;
}

export interface MessageThreadProps {
  conversationId: string;
  conversationKind: string;
  roomName: string | null;
  otherParticipants: FeedAuthor[];
  currentUser: ThreadCurrentUser;
  initialMessages: FeedMessage[];
  initialError: string | null;
  initialHasMore: boolean;
}

export function MessageThread({
  conversationId,
  conversationKind,
  roomName,
  otherParticipants,
  currentUser,
  initialMessages,
  initialError,
  initialHasMore,
}: MessageThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const isRoom = conversationKind === "community_room" || conversationKind === "regional_room";
  const other = otherParticipants[0];
  const title = isRoom ? roomName ?? "Community room" : other ? other.display_name || other.username : "Conversation";
  const showSenderName = isRoom || otherParticipants.length > 1;

  // Mark read on open, then refresh the shared layout's conversation list
  // (server re-fetch, no Realtime) so its unread indicator/preview updates.
  useEffect(() => {
    const supabase = createClient();
    markConversationRead(supabase, { conversationId, currentUserId: currentUser.id }).then(() => {
      router.refresh();
    });
    // Intentionally runs once per conversation id, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function loadMoreOlder() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const supabase = createClient();
    const from = messages.length;
    const { messages: older, error } = await fetchMessagesPage(supabase, {
      conversationId,
      from,
      to: from + MESSAGES_PAGE_SIZE - 1,
      currentUserId: currentUser.id,
    });

    setLoadingMore(false);
    if (error) {
      setLoadMoreError(error);
      return;
    }
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length === MESSAGES_PAGE_SIZE);
  }

  function handleSent(message: FeedMessage) {
    setMessages((prev) => [...prev, message]);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/messages"
          aria-label="Back to conversations"
          className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white lg:hidden"
        >
          <BackIcon />
        </Link>
        {isRoom ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-text-muted">
            <MessageBubbleIcon size={18} />
          </span>
        ) : (
          <Avatar url={other?.avatar_url ?? null} name={title} size={36} />
        )}
        <span className="font-display font-semibold text-white">{title}</span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        {initialError ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-text-muted">
            {initialError}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="font-display text-base font-semibold text-white">No messages yet</p>
            <p className="text-sm text-text-muted">Say something to get the conversation started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {loadMoreError ? (
              <div className="flex flex-col items-center gap-2 pb-2 text-center">
                <p className="text-sm text-text-muted">{loadMoreError}</p>
                <Button variant="secondary" size="sm" onClick={loadMoreOlder}>
                  <RefreshIcon />
                  Try again
                </Button>
              </div>
            ) : hasMore ? (
              <div className="flex justify-center pb-2">
                <Button variant="secondary" size="sm" onClick={loadMoreOlder} loading={loadingMore}>
                  {loadingMore ? "Loading..." : "Load earlier messages"}
                </Button>
              </div>
            ) : null}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUser.id}
                showSenderName={showSenderName}
                currentUserId={currentUser.id}
              />
            ))}
          </div>
        )}
      </div>

      <MessageComposer conversationId={conversationId} currentUser={currentUser} onSent={handleSent} />
    </div>
  );
}
