"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { BackIcon } from "@/components/messaging/MessagingIcons";
import { RefreshIcon } from "./CommunityIcons";
import { ShieldIcon, MoreIcon, ChartIcon, ArrowDownIcon } from "./RoomIcons";
import { ReportButton } from "@/components/moderation/ReportButton";
import { FlagIcon } from "@/components/moderation/ModerationIcons";
import { RoomAvatar } from "./RoomVisual";
import { RoomComposer, type ReplyTarget } from "./RoomComposer";
import { RoomMembersPanel } from "./RoomMembersPanel";
import { RoomPollsPanel } from "./RoomPollsPanel";
import { leaveRoom } from "@/lib/community/rooms";
import { fetchHiddenProfileIds } from "@/lib/moderation/blocks";
import {
  fetchMessagesPage,
  fetchMessageById,
  fetchMessagesAround,
  fetchMessageReactions,
  MESSAGES_PAGE_SIZE,
  type FeedMessage,
} from "@/lib/messaging/messages";
import type { ThreadCurrentUser } from "@/components/messaging/MessageThread";
import type { RoomSummary } from "@/lib/community/rooms";

export interface RoomChatProps {
  room: RoomSummary;
  currentUser: ThreadCurrentUser;
  canModerate: boolean;
  initialMessages: FeedMessage[];
  initialError: string | null;
  initialHasMore: boolean;
  /**
   * Phase 17 deep-linking — set when the page loaded via a reply/mention
   * notification's `?message=` param. `initialMessages` will already be an
   * anchored window around it (see the page's own data-fetching) — or it
   * could already have been within the live tail's normal first page. Set
   * whenever a highlight target was resolved at all, regardless of which.
   */
  initialHighlightMessageId?: string | null;
  /**
   * True only when `initialMessages` came from the special anchored fetch
   * (the target wasn't in the normal live-tail page) — controls whether
   * "Jump to latest" needs to re-fetch the real tail from scratch (this
   * view isn't it) or can just scroll (it already is the live tail, the
   * highlighted message just happens to not be its last item yet).
   */
  initialIsAnchored?: boolean;
}

/** A poll announcement rendered inline in the chat timeline — see the Realtime section below. Deliberately minimal (no options/votes here); "View & vote" opens the full RoomPollsPanel. */
interface PollAnnouncement {
  id: string;
  question: string;
  createdAt: string;
}

const NEAR_BOTTOM_THRESHOLD_PX = 120;

/**
 * Fan Rooms' chat surface — a fresh, room-tailored presentation (header
 * with live member count + moderation entry point, richer composer) that
 * still reuses the exact same message data layer as DMs
 * (fetchMessagesPage/sendMessage/MessageBubble), just not MessageThread's
 * own two-pane-DM-shell markup, which this route (a single full page under
 * /community/rooms, not the /messages two-pane shell) doesn't share.
 *
 * Realtime: one channel per room, subscribing to three things —
 * - `messages` INSERT (original, Phase "Master Completion"): new rows
 *   arrive as bare columns with no joins, so each one is re-fetched by id
 *   (fetchMessageById) to hydrate sender/media/reactions/replyTo.
 * - `message_reactions` INSERT/UPDATE/DELETE (Phase 17, migration 033): no
 *   per-conversation filter exists on this table (it has no conversation_id
 *   column), so this listens unfiltered and checks the affected message_id
 *   against the messages already loaded in this room, ignoring anything
 *   else — RLS still bounds delivery to rooms/DMs this user actually
 *   participates in, this is just an additional client-side narrowing.
 * - `room_polls` INSERT (Phase 17, migration 033): filtered by
 *   conversation_id (a real column here), rendered as a small inline
 *   announcement card in the chat timeline.
 *
 * All three share one channel/one subscribe call and are torn down
 * together on unmount/room change — no separate leak-prone subscriptions.
 */
export function RoomChat({
  room,
  currentUser,
  canModerate,
  initialMessages,
  initialError,
  initialHasMore,
  initialHighlightMessageId,
  initialIsAnchored = false,
}: RoomChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [pollsOpen, setPollsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [pollAnnouncements, setPollAnnouncements] = useState<PollAnnouncement[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isAnchored, setIsAnchored] = useState(initialIsAnchored);
  const [atBottom, setAtBottom] = useState(!initialHighlightMessageId);
  // Blocked (either direction — "full mutual block") and muted authors'
  // messages are hidden here at render time only, never removed from
  // `messages` itself — see fetchHiddenProfileIds' own doc comment for why
  // (moderator visibility, reply-context resolution, and keeping the
  // scroll/pagination math above untouched by a second, filtered list).
  const [hiddenProfileIds, setHiddenProfileIds] = useState<Set<string>>(new Set());
  const [newMessageCount, setNewMessageCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const pollIdsRef = useRef(new Set<string>());
  const messageNodesRef = useRef(new Map<string, HTMLDivElement>());
  const atBottomRef = useRef(atBottom);
  const pendingScrollToRef = useRef<string | null>(initialHighlightMessageId ?? null);
  const prependAdjustRef = useRef<{ scrollHeight: number } | null>(null);

  useEffect(() => {
    atBottomRef.current = atBottom;
  }, [atBottom]);

  useEffect(() => {
    const supabase = createClient();
    fetchHiddenProfileIds(supabase, currentUser.id).then(setHiddenProfileIds);
  }, [currentUser.id]);

  function setMessageNode(id: string, el: HTMLDivElement | null) {
    if (el) messageNodesRef.current.set(id, el);
    else messageNodesRef.current.delete(id);
  }

  const flashHighlight = useCallback((id: string) => {
    setHighlightedId(id);
    setTimeout(() => setHighlightedId((current) => (current === id ? null : current)), 2000);
  }, []);

  const scrollToNode = useCallback((id: string) => {
    const el = messageNodesRef.current.get(id);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    return true;
  }, []);

  /**
   * Locates a message — scrolling to it if already rendered, otherwise
   * fetching an anchored window around it and replacing the loaded page.
   * Shared by the initial `?message=` deep link and in-chat reply-preview
   * clicks (MessageBubble's onJumpToParent), so both paths behave
   * identically. Never throws/breaks the view for a missing or
   * inaccessible target — it just does nothing, per the "graceful" spec.
   */
  const jumpToMessage = useCallback(
    async (targetId: string) => {
      if (scrollToNode(targetId)) {
        flashHighlight(targetId);
        return;
      }

      const supabase = createClient();
      const { messages: anchored, found } = await fetchMessagesAround(supabase, {
        conversationId: room.conversationId,
        messageId: targetId,
        currentUserId: currentUser.id,
      });

      if (!found) return; // deleted or no longer accessible — leave the current view untouched

      messageIdsRef.current = new Set(anchored.map((m) => m.id));
      setMessages(anchored);
      setHasMore(true); // an anchored window never claims to be the start of history
      setIsAnchored(true);
      setAtBottom(false);
      pendingScrollToRef.current = targetId;
    },
    [room.conversationId, currentUser.id, scrollToNode, flashHighlight],
  );

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
          fetchMessageById(supabase, newId, currentUser.id).then((message) => {
            if (!message) return;
            if (messageIdsRef.current.has(message.id)) return;
            messageIdsRef.current.add(message.id);
            setMessages((prev) => [...prev, message]);
            if (message.senderId === currentUser.id || atBottomRef.current) {
              setAtBottom(true);
            } else {
              setNewMessageCount((n) => n + 1);
            }
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { message_id?: string } | null;
          const messageId = row?.message_id;
          if (!messageId || !messageIdsRef.current.has(messageId)) return;
          fetchMessageReactions(supabase, messageId, currentUser.id).then((reactions) => {
            if (reactions === null) return;
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_polls", filter: `conversation_id=eq.${room.conversationId}` },
        (payload) => {
          const row = payload.new as { id: string; question: string; created_at: string; created_by: string };
          if (pollIdsRef.current.has(row.id)) return;
          pollIdsRef.current.add(row.id);
          // Skip announcing a poll this same client just created — its
          // creator already sees it appear at the top of RoomPollsPanel the
          // instant CreatePollDialog resolves; a second inline card for the
          // exact same poll a moment later would just be noisy.
          if (row.created_by === currentUser.id) return;
          setPollAnnouncements((prev) => [...prev, { id: row.id, question: row.question, createdAt: row.created_at }]);
        },
      )
      .subscribe((status) => {
        setConnectionLost(status === "CHANNEL_ERROR" || status === "TIMED_OUT");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.conversationId, currentUser.id]);

  // Track whether the reader is near the bottom, to decide whether a new
  // message should auto-scroll or just bump the "new messages" pill.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleScroll() {
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
      setAtBottom(nearBottom);
      if (nearBottom) setNewMessageCount(0);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Runs after every render where messages changed — three distinct scroll
  // intents, never more than one applies for a given update:
  // 1. A pending jump target (deep link or reply-click) just became
  //    available in the DOM — scroll to it once, then clear the intent.
  // 2. Older messages were just prepended (loadMoreOlder) — restore the
  //    exact same visual scroll position rather than let the browser's
  //    default "stay at scrollTop 0" behavior yank the reader to the top.
  // 3. Neither of the above, and the reader was already at the bottom —
  //    auto-scroll to the new bottom (initial load, or a message arriving
  //    while already caught up).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (pendingScrollToRef.current) {
      const target = pendingScrollToRef.current;
      if (scrollToNode(target)) {
        pendingScrollToRef.current = null;
        flashHighlight(target);
      }
      return;
    }

    if (prependAdjustRef.current) {
      const { scrollHeight: previousHeight } = prependAdjustRef.current;
      prependAdjustRef.current = null;
      el.scrollTop += el.scrollHeight - previousHeight;
      return;
    }

    if (atBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [messages, scrollToNode, flashHighlight]);

  async function loadMoreOlder() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const supabase = createClient();

    // Anchored views (opened via a deep link, not the live tail) load
    // older history by "before the oldest message currently shown" rather
    // than by page offset — an offset would be relative to the live tail's
    // page 0, which this view never fetched.
    const { messages: older, error } = isAnchored && messages.length > 0
      ? await fetchMessagesAround(supabase, {
          conversationId: room.conversationId,
          messageId: messages[0].id,
          currentUserId: currentUser.id,
        }).then((result) => ({
          messages: result.messages.filter((m) => !messageIdsRef.current.has(m.id)),
          error: result.error,
        }))
      : await fetchMessagesPage(supabase, {
          conversationId: room.conversationId,
          from: messages.length,
          to: messages.length + MESSAGES_PAGE_SIZE - 1,
          currentUserId: currentUser.id,
        });

    setLoadingMore(false);
    if (error) {
      setLoadMoreError(error);
      return;
    }
    if (older.length === 0) {
      setHasMore(false);
      return;
    }
    if (scrollRef.current) {
      prependAdjustRef.current = { scrollHeight: scrollRef.current.scrollHeight };
    }
    older.forEach((m) => messageIdsRef.current.add(m.id));
    setMessages((prev) => [...older, ...prev]);
    // The anchored path's "older" batch is at most half a page (see
    // fetchMessagesAround) even when more history remains, so its own
    // length can't be compared against MESSAGES_PAGE_SIZE the way the
    // normal paged path's can — stay optimistic there and let the next
    // empty result (handled above) be what finally clears hasMore.
    setHasMore(isAnchored ? true : older.length === MESSAGES_PAGE_SIZE);
  }

  function handleSent(message: FeedMessage) {
    messageIdsRef.current.add(message.id);
    setMessages((prev) => [...prev, message]);
    setAtBottom(true);
    setNewMessageCount(0);
  }

  function handleReply(message: FeedMessage) {
    const preview = message.deletedAt ? "Message deleted" : message.body || (message.media ? "Attachment" : "");
    setReplyTo({
      id: message.id,
      senderName: message.sender.display_name || message.sender.username,
      preview,
    });
  }

  function scrollToBottomNow() {
    if (isAnchored) {
      // Anchored views (deep link / reply jump into older history) don't
      // know if there's anything newer than their own fetched window —
      // "jump to latest" here means "reload the real live tail," not just
      // scrolling within a window that might not even reach it.
      setLoadingMore(true);
      const supabase = createClient();
      fetchMessagesPage(supabase, {
        conversationId: room.conversationId,
        from: 0,
        to: MESSAGES_PAGE_SIZE - 1,
        currentUserId: currentUser.id,
      }).then(({ messages: latest, error }) => {
        setLoadingMore(false);
        if (error || latest.length === 0) return;
        messageIdsRef.current = new Set(latest.map((m) => m.id));
        setMessages(latest);
        setHasMore(latest.length === MESSAGES_PAGE_SIZE);
        setIsAnchored(false);
        setAtBottom(true);
        setNewMessageCount(0);
      });
      return;
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setAtBottom(true);
    setNewMessageCount(0);
  }

  async function handleLeave() {
    if (leaving) return;
    setLeaving(true);
    const supabase = createClient();
    const { error } = await leaveRoom(supabase, { conversationId: room.conversationId, currentUserId: currentUser.id });
    setLeaving(false);
    if (!error) router.push("/community/rooms");
  }

  const showJumpPill = !atBottom || isAnchored;

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
          <button
            type="button"
            onClick={() => setPollsOpen(true)}
            aria-label="Room polls"
            title="Polls"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white"
          >
            <ChartIcon size={18} />
          </button>
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
          <ReportButton
            targetType="room"
            targetId={room.conversationId}
            currentUserId={currentUser.id}
            ariaLabel="Report this room"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white"
          >
            <FlagIcon size={18} />
          </ReportButton>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden px-4 py-4">
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

              {messages
                .filter((message) => !hiddenProfileIds.has(message.senderId))
                .map((message) => (
                <div
                  key={message.id}
                  ref={(el) => setMessageNode(message.id, el)}
                  className={`rounded-card transition-colors duration-500 ${
                    highlightedId === message.id ? "bg-red-primary/10 ring-1 ring-red-primary/40" : ""
                  }`}
                >
                  <MessageBubble
                    message={message}
                    isOwn={message.senderId === currentUser.id}
                    showSenderName
                    interactive
                    currentUserId={currentUser.id}
                    onReply={handleReply}
                    onJumpToParent={jumpToMessage}
                  />
                </div>
              ))}

              {pollAnnouncements.map((poll) => (
                <div key={poll.id} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPollsOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-red-primary/30 bg-red-primary/[0.08] px-4 py-2 text-xs text-text-body transition-colors hover:bg-red-primary/[0.14]"
                  >
                    <ChartIcon size={14} />
                    <span>
                      New poll: <span className="font-medium text-white">{poll.question}</span>
                    </span>
                    <span className="font-semibold text-red-primary">Vote now</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showJumpPill ? (
          <button
            type="button"
            onClick={scrollToBottomNow}
            aria-label={newMessageCount > 0 ? `${newMessageCount} new messages — jump to latest` : "Jump to latest messages"}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-bg-elevated px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-white/10"
          >
            {newMessageCount > 0 ? `${newMessageCount} new message${newMessageCount === 1 ? "" : "s"}` : "Jump to latest"}
            <ArrowDownIcon size={14} />
          </button>
        ) : null}
      </div>

      <RoomComposer
        conversationId={room.conversationId}
        currentUser={currentUser}
        onSent={handleSent}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />

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

      {pollsOpen ? (
        <RoomPollsPanel
          conversationId={room.conversationId}
          currentUserId={currentUser.id}
          canModerate={canModerate}
          onClose={() => setPollsOpen(false)}
        />
      ) : null}
    </div>
  );
}
