"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Navbar brand={<Wordmark />} />
      <main className="flex flex-1 items-center justify-center bg-bg-void px-4 py-24">
        <div className="max-w-sm text-center">
          <p className="font-display text-xl font-bold text-ink">Something went wrong</p>
          <p className="mt-2 text-sm text-text-muted">We couldn&apos;t load the admin area. Please try again.</p>
          <Button className="mt-6" onClick={reset}>
            Try again
          </Button>
        </div>
      </main>
    </>
  );
}
