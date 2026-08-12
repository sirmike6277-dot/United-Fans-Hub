"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/format";
import { CheckIcon } from "./NotificationIcons";
import { notificationCopy, notificationHref, type FeedNotification } from "@/lib/notifications/notifications";

export interface NotificationItemProps {
  notification: FeedNotification;
  /** Parent owns the actual write + optimistic update + rollback (it also needs this for "mark all as read"). */
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const router = useRouter();
  const isUnread = notification.readAt === null;
  const href = notificationHref(notification);
  const actorName = notification.actor
    ? notification.actor.display_name || notification.actor.username
    : "United Fans Hub";

  function handleActivate() {
    if (isUnread) onMarkRead(notification.id);
    if (href) router.push(href);
  }

  const isInteractive = Boolean(href) || isUnread;

  return (
    <div
      className={`flex items-start gap-3 rounded-card border px-4 py-3 transition-colors ${
        isUnread ? "border-red-primary/30 bg-red-primary/[0.06]" : "border-white/10 bg-bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={handleActivate}
        disabled={!isInteractive}
        className="flex flex-1 items-start gap-3 rounded-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary disabled:cursor-default"
        aria-label={notificationCopy(notification)}
      >
        <Avatar url={notification.actor?.avatar_url ?? null} name={actorName} size={40} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${isUnread ? "text-white" : "text-text-body"}`}>
            {notificationCopy(notification)}
          </p>
          <time dateTime={notification.createdAt} suppressHydrationWarning className="text-xs text-text-muted">
            {formatRelativeTime(notification.createdAt)}
          </time>
        </div>
        {isUnread ? (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-primary" aria-hidden="true" />
        ) : null}
      </button>

      {isUnread ? (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          aria-label="Mark as read"
          title="Mark as read"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
        >
          <CheckIcon />
        </button>
      ) : null}
    </div>
  );
}
