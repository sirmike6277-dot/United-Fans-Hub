"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { NotificationItem } from "./NotificationItem";
import { NotificationsSkeleton } from "./NotificationsSkeleton";
import { DoubleCheckIcon, BellIcon } from "./NotificationIcons";
import { RefreshIcon } from "@/components/community/CommunityIcons";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  fetchNotificationsPage,
  NOTIFICATIONS_PAGE_SIZE,
  type FeedNotification,
} from "@/lib/notifications/notifications";

type FilterKey = "all" | "mentions" | "likes" | "comments" | "follows" | "messages";

/**
 * Filters over this app's real notification `type` values (see migration
 * 006's check constraint: like/comment/mention/reply/message/follow, plus
 * moderation_action from migration 026) — the reference design's
 * "Predictions"/"System" tabs have no matching type anywhere in the
 * schema, so they're not included rather than shown as tabs that would
 * always be empty. `moderation_action` likewise has no dedicated tab (rare
 * and sensitive) — it's only reachable via "All", by design.
 */
const FILTERS: { key: FilterKey; label: string; match: (type: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "mentions", label: "Mentions", match: (t) => t === "mention" },
  { key: "likes", label: "Likes", match: (t) => t === "like" },
  { key: "comments", label: "Comments", match: (t) => t === "comment" || t === "reply" },
  { key: "follows", label: "Follows", match: (t) => t === "follow" },
  { key: "messages", label: "Messages", match: (t) => t === "message" },
];

export interface NotificationsFeedProps {
  currentUserId: string;
  initialNotifications: FeedNotification[];
  initialError: string | null;
  initialHasMore: boolean;
  /** True once the caller renders its own <h1> above this (see notifications/page.tsx's SectionBanner) — "Mark all as read" moves out of PageHeader's action slot into its own row so it isn't lost. */
  hideHeader?: boolean;
}

export function NotificationsFeed({
  currentUserId,
  initialNotifications,
  initialError,
  initialHasMore,
  hideHeader = false,
}: NotificationsFeedProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const unreadIds = notifications.filter((n) => n.readAt === null).map((n) => n.id);
  const visibleNotifications = notifications.filter((n) => FILTERS.find((f) => f.key === filter)!.match(n.type));

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    const supabase = createClient();
    const from = notifications.length;
    const { notifications: next, error } = await fetchNotificationsPage(supabase, {
      from,
      to: from + NOTIFICATIONS_PAGE_SIZE - 1,
      currentUserId,
    });

    setLoadingMore(false);
    if (error) {
      setLoadMoreError(error);
      return;
    }
    setNotifications((prev) => [...prev, ...next]);
    setHasMore(next.length === NOTIFICATIONS_PAGE_SIZE);
  }

  async function markRead(id: string) {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.readAt !== null) return;

    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: now } : n)));

    const supabase = createClient();
    // Narrowly scoped write — only ever sets read_at, on this one row, for
    // this recipient. See the security review: the current RLS UPDATE
    // policy technically permits touching other columns too, which this
    // code deliberately never does.
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .eq("recipient_id", currentUserId);

    if (error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: null } : n)));
    }
  }

  async function markAllRead() {
    if (unreadIds.length === 0 || markingAll) return;
    setMarkingAll(true);

    const idsBeingMarked = [...unreadIds];
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (idsBeingMarked.includes(n.id) ? { ...n, readAt: now } : n)),
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", currentUserId)
      .is("read_at", null);

    setMarkingAll(false);
    if (error) {
      setNotifications((prev) =>
        prev.map((n) => (idsBeingMarked.includes(n.id) ? { ...n, readAt: null } : n)),
      );
    }
  }

  const markAllButton = (
    <Button variant="secondary" size="sm" onClick={markAllRead} disabled={unreadIds.length === 0 || markingAll}>
      <DoubleCheckIcon size={14} />
      {markingAll ? "Marking..." : "Mark all as read"}
    </Button>
  );

  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${hideHeader ? "pb-6 sm:pb-8" : "py-6 sm:py-8"}`}>
      {hideHeader ? (
        <div className="flex justify-end">{markAllButton}</div>
      ) : (
        <PageHeader title="Notifications" action={markAllButton} />
      )}

      {initialError ? (
        <div className="rounded-card border border-ink/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
          {initialError}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-ink/10 bg-bg-surface p-10 text-center">
          <BellIcon size={28} />
          <p className="font-display text-lg font-semibold text-ink">No notifications yet</p>
          <p className="text-sm text-text-muted">
            Likes, comments, replies, and follows will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                  filter === f.key ? "bg-red-primary text-white" : "bg-ink/5 text-text-muted hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visibleNotifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">Nothing here yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onMarkRead={markRead} />
              ))}
            </div>
          )}

          {loadingMore ? (
            <div className="flex flex-col gap-2">
              <NotificationsSkeleton />
              <NotificationsSkeleton />
            </div>
          ) : null}

          {loadMoreError ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <p className="text-sm text-text-muted">{loadMoreError}</p>
              <Button variant="secondary" size="sm" onClick={loadMore}>
                <RefreshIcon />
                Try again
              </Button>
            </div>
          ) : hasMore ? (
            <div className="flex justify-center py-2">
              <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-text-muted">You&apos;re all caught up.</p>
          )}
        </>
      )}
    </div>
  );
}
