import type { Metadata } from "next";
import { MessageBubbleIcon } from "@/components/messaging/MessagingIcons";

export const metadata: Metadata = {
  title: "Messages — United Fans Hub",
};

// Right-pane placeholder shown on desktop when no conversation is selected.
// Hidden entirely on mobile (see MessagingShell) — there, the conversation
// list itself is the full-width view for this route.
export default function MessagesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <MessageBubbleIcon size={32} />
      <p className="font-display text-lg font-semibold text-ink">Select a conversation</p>
      <p className="text-sm text-text-muted">Choose someone from your messages to start reading.</p>
    </div>
  );
}
