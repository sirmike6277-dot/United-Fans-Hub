import { AppShell } from "@/components/layout/AppShell";

// Mirrors the real page's badge grid — see dashboard/loading.tsx for why
// every gated route gets its own tailored skeleton (Sidebar present from
// first paint, no layout shift) rather than falling through to the root
// app/loading.tsx fallback.
export default function AchievementsLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-6 py-6 sm:py-8" aria-hidden="true">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-64 max-w-full animate-pulse rounded bg-white/5" />
            </div>
            <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-card border border-white/10 bg-bg-surface p-6">
                <div className="h-14 w-14 animate-pulse rounded-full bg-white/10" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
