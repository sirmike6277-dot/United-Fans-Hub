import { AppShell } from "@/components/layout/AppShell";

/**
 * Was missing entirely (Phase 15 audit finding) — /predictions runs 5
 * parallel Supabase queries before it can render anything, so a real user
 * would otherwise see a blank white-to-black flash on first navigation.
 * Includes a generic rail placeholder matching the real page's
 * "Next To Predict" card + quote rail, so nothing shifts once it resolves.
 */
export default function PredictionsLoading() {
  return (
    <AppShell
      rail={
        <div className="flex flex-col gap-6" aria-hidden="true">
          <div className="h-32 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-28 animate-pulse rounded-card bg-bg-surface" />
        </div>
      }
    >
      <main className="flex-1 bg-bg-void">
        <div className="flex max-w-3xl flex-col gap-6 py-6 sm:py-8" aria-hidden="true">
          <div className="h-[240px] animate-pulse rounded-card bg-bg-surface sm:h-[300px]" />
          <div className="h-32 animate-pulse rounded-card bg-bg-surface" />
          <div className="flex gap-2">
            <div className="h-9 w-28 animate-pulse rounded-control bg-bg-elevated" />
            <div className="h-9 w-28 animate-pulse rounded-control bg-bg-elevated" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-card bg-bg-surface" />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
