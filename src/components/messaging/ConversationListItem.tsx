import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/format";
import { MessageBubbleIcon } from "./MessagingIcons";
import type { ConversationSummary } from "@/lib/messaging/conversations";

export interface ConversationListItemProps {
  conversation: ConversationSummary;
  currentUserId: string;
}

function previewText(conversation: ConversationSummary): string {
  const { lastMessage } = conversation;
  if (!lastMessage) return "No messages yet";
  if (lastMessage.deletedAt) return "This message was deleted";
  if (lastMessage.body) return lastMessage.body;
  // A null body with no text means the message is media-only (schema allows
  // this) — we don't have the attachment details in this list query, so a
  // simple, honest fallback rather than guessing the media type.
  return "Sent an attachment";
}

export function ConversationListItem({ conversation, currentUserId }: ConversationListItemProps) {
  const isRoom = conversation.kind === "community_room" || conversation.kind === "regional_room";
  const other = conversation.otherParticipants[0];
  const extraOthers = conversation.otherParticipants.length - 1;

  const title = isRoom
    ? conversation.room?.name ?? "Community room"
    : other
      ? (other.display_name || other.username) + (extraOthers > 0 ? ` +${extraOthers}` : "")
      : "Conversation";

  const timestamp = conversation.lastMessage?.createdAt ?? conversation.createdAt;
  const isOwnLastMessage = conversation.lastMessage?.senderId === currentUserId;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={`flex items-center gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5 ${
        conversation.unread ? "bg-red-primary/[0.05]" : ""
      }`}
    >
      {isRoom ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-text-muted">
          <MessageBubbleIcon />
        </span>
      ) : (
        <Avatar url={other?.avatar_url ?? null} name={title} size={44} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm font-semibold ${conversation.unread ? "text-white" : "text-text-body"}`}>
            {title}
          </span>
          <time
            dateTime={timestamp}
            suppressHydrationWarning
            className="shrink-0 text-xs text-text-muted"
          >
            {formatRelativeTime(timestamp)}
          </time>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${conversation.unread ? "text-text-body" : "text-text-muted"}`}>
            {isOwnLastMessage ? "You: " : ""}
            {previewText(conversation)}
          </p>
          {conversation.unread ? (
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-primary" aria-hidden="true" />
          ) : null}
        </div>
        {isRoom && conversation.room?.isRegional ? (
          <Badge tone="outline" className="mt-1 !px-1.5 !py-0 text-[10px]">
            {conversation.room.region ?? "Regional"}
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}
