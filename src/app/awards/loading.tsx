import { AppShell } from "@/components/layout/AppShell";

// Mirrors the real page's SectionBanner + tab strip + nominee-card list —
// see members/loading.tsx for why the banner placeholder is a plain block,
// not a copy of SectionBanner's own imagery/quote.
export default function AwardsLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 pt-6 sm:pt-8" aria-hidden="true">
          <div className="h-[240px] animate-pulse rounded-card bg-bg-surface sm:h-[300px]" />
        </div>
        <div className="flex flex-col gap-4 pb-6 sm:pb-8" aria-hidden="true">
          <div className="flex gap-4 border-b border-ink/10 pb-2.5">
            <div className="h-4 w-28 animate-pulse rounded bg-ink/10" />
            <div className="h-4 w-28 animate-pulse rounded bg-ink/5" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-control bg-bg-surface" />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
