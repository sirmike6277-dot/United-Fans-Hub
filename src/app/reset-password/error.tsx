"use client";

import { useEffect } from "react";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";

/** No Navbar here — the real /reset-password page has none (see AuthLayout). */
export default function ResetPasswordError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-void px-4 text-center">
      <Wordmark />
      <div className="max-w-sm">
        <p className="font-display text-xl font-bold text-white">Something went wrong</p>
        <p className="mt-2 text-sm text-text-muted">
          We couldn&apos;t load this page. Your reset link may have expired — request a new one.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button href="/forgot-password" variant="secondary">
            Request new link
          </Button>
        </div>
      </div>
    </div>
  );
}
