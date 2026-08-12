"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { BackIcon } from "@/components/messaging/MessagingIcons";
import { RefreshIcon } from "./CommunityIcons";
import { ShieldIcon, MoreIcon } from "./RoomIcons";
import { RoomAvatar } from "./RoomVisual";
import { RoomComposer } from "./RoomComposer";
import { RoomMembersPanel } from "./RoomMembersPanel";
import { leaveRoom } from "@/lib/community/rooms";
import { fetchMessagesPage, fetchMessageById, MESSAGES_PAGE_SIZE, type FeedMessage } from "@/lib/messaging/messages";
import type { ThreadCurrentUser } from "@/components/messaging/MessageThread";
import type { RoomSummary } from "@/lib/community/rooms";

export interface RoomChatProps {
  room: RoomSummary;
  currentUser: ThreadCurrentUser;
  canModerate: boolean;
  initialMessages: FeedMessage[];
  initialError: string | null;
  initialHasMore: boolean;
}

/**
 * Fan Rooms' chat surface — a fresh, room-tailored presentation (header
 * with live member count + moderation entry point, richer composer) that
 * still reuses the exact same message data layer as DMs
 * (fetchMessagesPage/sendMessage/MessageBubble), just not MessageThread's
 * own two-pane-DM-shell markup, which this route (a single full page under
 * /community/rooms, not the /messages two-pane shell) doesn't share.
 *
 * Realtime: subscribes to `postgres_changes` INSERT on `messages` filtered
 * to this room's conversation_id (see migration 025 — RLS still gates who
 * can actually receive each event, same participant-only boundary as a
 * normal read). New rows arrive as bare columns with no joins, so each one
 * is re-fetched by id (fetchMessageById) to hydrate sender/media — cheap at
 * chat message volumes, and avoids duplicating the join logic client-side.
 * Deduplicates against the sender's own optimistic insert by message id.
 */
export function RoomChat({ room, currentUser, canModerate, initialMessages, initialError, initialHasMore }: RoomChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));

  // Realtime subscription — one channel per room, torn down on unmount/room change.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room-messages-${room.conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${room.conversationId}` },
        (payload) => {
          const newId = (payload.new as { id: string }).id;
          if (messageIdsRef.current.has(newId)) return; // our own optimistic insert already rendered it
          fetchMessageById(supabase, newId).then((message) => {
            if (!message) return;
            if (messageIdsRef.current.has(message.id)) return;
            messageIdsRef.current.add(message.id);
            setMessages((prev) => [...prev, message]);
          });
        },
      )
      .subscribe((status) => {
        setConnectionLost(status === "CHANNEL_ERROR" || status === "TIMED_OUT");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.conversationId]);

  // Keep the thread scrolled to the newest message on first load and as new ones arrive.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function loadMoreOlder() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const supabase = createClient();
    const from = messages.length;
    const { messages: older, error } = await fetchMessagesPage(supabase, {
      conversationId: room.conversationId,
      from,
      to: from + MESSAGES_PAGE_SIZE - 1,
    });

    setLoadingMore(false);
    if (error) {
      setLoadMoreError(error);
      return;
    }
    older.forEach((m) => messageIdsRef.current.add(m.id));
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length === MESSAGES_PAGE_SIZE);
  }

  function handleSent(message: FeedMessage) {
    messageIdsRef.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }

  async function handleLeave() {
    if (leaving) return;
    setLeaving(true);
    const supabase = createClient();
    const { error } = await leaveRoom(supabase, { conversationId: room.conversationId, currentUserId: currentUser.id });
    setLeaving(false);
    if (!error) router.push("/community/rooms");
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/community/rooms"
          aria-label="Back to Fan Rooms"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white"
        >
          <BackIcon />
        </Link>
        <RoomAvatar name={room.name} slug={room.slug} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold text-white">{room.name}</p>
          <p className="truncate text-xs text-text-muted">
            {room.memberCount.toLocaleString()} {room.memberCount === 1 ? "member" : "members"}
            {connectionLost ? " · reconnecting..." : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canModerate ? (
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              aria-label="Manage room members"
              title="Manage members"
              className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white"
            >
              <ShieldIcon size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              aria-label="View room members"
              title="Members"
              className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white"
            >
              <MoreIcon />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {initialError ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-text-muted">{initialError}</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="font-display text-base font-semibold text-white">No messages yet</p>
            <p className="text-sm text-text-muted">Be the first to say something in {room.name}.</p>
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
              <MessageBubble key={message.id} message={message} isOwn={message.senderId === currentUser.id} showSenderName />
            ))}
          </div>
        )}
      </div>

      <RoomComposer conversationId={room.conversationId} currentUser={currentUser} onSent={handleSent} />

      <div className="flex justify-center border-t border-white/10 py-2">
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          className="text-xs text-text-muted transition-colors hover:text-red-hover disabled:opacity-50"
        >
          {leaving ? "Leaving..." : "Leave room"}
        </button>
      </div>

      {membersOpen ? (
        <RoomMembersPanel
          conversationId={room.conversationId}
          currentUserId={currentUser.id}
          canModerate={canModerate}
          onClose={() => setMembersOpen(false)}
        />
      ) : null}
    </div>
  );
}
