"use client";

import { usePathname } from "next/navigation";
import { ConversationList } from "./ConversationList";
import type { ConversationSummary } from "@/lib/messaging/conversations";

export interface MessagingShellProps {
  initialConversations: ConversationSummary[];
  initialError: string | null;
  currentUserId: string;
  children: React.ReactNode;
}

/**
 * Persistent two-pane shell shared by /messages and /messages/[conversationId]
 * (see the layout that wraps both). Desktop: list always visible, thread
 * content in the right pane. Mobile: single pane — the list shows only on
 * the index route, the thread takes the full screen on a conversation route
 * (with its own back affordance — see MessageThread).
 */
export function MessagingShell({
  initialConversations,
  initialError,
  currentUserId,
  children,
}: MessagingShellProps) {
  const pathname = usePathname();
  const onIndex = pathname === "/messages";

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl">
      <div
        className={`w-full shrink-0 border-r border-white/10 lg:block lg:w-80 ${onIndex ? "block" : "hidden"}`}
      >
        <ConversationList
          initialConversations={initialConversations}
          initialError={initialError}
          currentUserId={currentUserId}
        />
      </div>
      <div className={`min-w-0 flex-1 flex-col ${onIndex ? "hidden lg:flex" : "flex"}`}>{children}</div>
    </div>
  );
}
