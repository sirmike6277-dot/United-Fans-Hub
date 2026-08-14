"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Renders inside MessagingShell's right pane (see messages/layout.tsx,
 * which stays mounted around this boundary) — no Navbar/Footer here,
 * matching this segment's own page.tsx, which has none either.
 */
export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-display text-base font-semibold text-ink">Something went wrong</p>
      <p className="text-sm text-text-muted">We couldn&apos;t load this conversation. Please try again.</p>
      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <Button href="/messages" variant="secondary" size="sm">
          Back to messages
        </Button>
      </div>
    </div>
  );
}
