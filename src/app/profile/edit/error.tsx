"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";

export default function EditProfileError({
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
    <>
      {/* Wordmark, not Brand — see community/error.tsx: Brand's ClubEmblem
          reads the filesystem and can only run server-side, and error.tsx
          is necessarily a Client Component. */}
      <Navbar brand={<Wordmark />} />
      <main className="flex flex-1 items-center justify-center bg-bg-void px-4 py-24">
        <div className="max-w-sm text-center">
          <p className="font-display text-xl font-bold text-white">Something went wrong</p>
          <p className="mt-2 text-sm text-text-muted">
            We couldn&apos;t load your profile editor. Please try again.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset}>Try again</Button>
            <Button href="/profile" variant="secondary">
              Back to profile
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
