import { AppShell } from "@/components/layout/AppShell";

// Mirrors the real page's PageHeader + filter row + report-card list.
export default function ModerationLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-4 py-6 sm:py-8" aria-hidden="true">
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-56 animate-pulse rounded bg-white/5" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-40 animate-pulse rounded-control bg-bg-elevated" />
            <div className="h-11 w-40 animate-pulse rounded-control bg-bg-elevated" />
          </div>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-card bg-bg-surface" />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
