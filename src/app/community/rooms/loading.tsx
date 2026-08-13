import { AppShell } from "@/components/layout/AppShell";

// Mirrors the real page's SectionBanner + search/create row + card grid —
// see members/loading.tsx for why the banner placeholder is a plain block,
// not a copy of SectionBanner's own imagery/quote.
export default function FanRoomsLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 pt-6 sm:pt-8" aria-hidden="true">
          <div className="h-[240px] animate-pulse rounded-card bg-bg-surface sm:h-[300px]" />
        </div>
        <div className="flex flex-col gap-4 pb-6 sm:pb-8" aria-hidden="true">
          <div className="h-11 w-full max-w-md animate-pulse rounded-control bg-bg-elevated" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-card border border-white/10 bg-bg-surface" />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
