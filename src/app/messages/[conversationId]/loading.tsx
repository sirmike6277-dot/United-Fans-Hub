/**
 * Renders inside MessagingShell's right pane (see messages/layout.tsx) —
 * no Navbar/Footer here, exactly like the real page.tsx it stands in for.
 * Shape mirrors MessageThread: header bar, alternating bubble placeholders,
 * composer-height bar at the bottom.
 */
export default function ConversationLoading() {
  return (
    <div className="flex h-full flex-col" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-ink/10" />
        <div className="h-4 w-32 animate-pulse rounded bg-ink/10" />
      </div>

      <div className="flex-1 space-y-3 overflow-hidden px-4 py-4">
        <div className="ml-auto h-10 w-2/5 animate-pulse rounded-control bg-ink/10" />
        <div className="h-10 w-1/2 animate-pulse rounded-control bg-ink/5" />
        <div className="ml-auto h-10 w-1/3 animate-pulse rounded-control bg-ink/10" />
        <div className="h-10 w-3/5 animate-pulse rounded-control bg-ink/5" />
      </div>

      <div className="h-[68px] shrink-0 border-t border-ink/10" />
    </div>
  );
}
