"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";

// Wordmark, not Brand — Brand's ClubEmblem reads the filesystem and can
// only run server-side, and this is a Client Component (see other error.tsx files).
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Navbar brand={<Wordmark />} />
      <main className="flex flex-1 items-center justify-center bg-bg-void px-4 py-24">
        <div className="max-w-sm text-center">
          <p className="font-display text-xl font-bold text-ink">Something went wrong</p>
          <p className="mt-2 text-sm text-text-muted">We couldn&apos;t load this room. Please try again.</p>
          <Button className="mt-6" onClick={reset}>
            Try again
          </Button>
        </div>
      </main>
    </>
  );
}
