import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";
import { MatchCardSkeleton } from "@/components/matches/MatchCardSkeleton";

/**
 * Shown by Next.js while the server component fetches (and possibly
 * lazy-revalidates via the provider) — genuinely useful here since a
 * provider round-trip can add real latency the first time in a while,
 * unlike prior phases' pages which never awaited an external API.
 */
export default function MatchesLoading() {
  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
          <div className="h-8 w-56 animate-pulse rounded bg-white/10" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
