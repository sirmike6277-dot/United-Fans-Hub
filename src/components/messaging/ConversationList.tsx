"use client";

import { ConversationListItem } from "./ConversationListItem";
import { MessageBubbleIcon } from "./MessagingIcons";
import type { ConversationSummary } from "@/lib/messaging/conversations";

export interface ConversationListProps {
  initialConversations: ConversationSummary[];
  initialError: string | null;
  currentUserId: string;
}

/**
 * Renders from server-provided props only — no client-side fetch-on-mount.
 * The list is refreshed by the shared /messages layout re-running on the
 * server (via router.refresh(), triggered when a thread is opened/marked
 * read — see MessageThread) rather than any client polling or Realtime.
 */
export function ConversationList({ initialConversations, initialError, currentUserId }: ConversationListProps) {
  if (initialError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-text-muted">
        {initialError}
      </div>
    );
  }

  if (initialConversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MessageBubbleIcon size={28} />
        <p className="font-display text-base font-semibold text-white">No conversations yet</p>
        <p className="text-sm text-text-muted">Your direct messages will appear here.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      {initialConversations.map((conversation) => (
        <ConversationListItem key={conversation.id} conversation={conversation} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
