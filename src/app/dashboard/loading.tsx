import { AppShell } from "@/components/layout/AppShell";

// Wrapped in AppShell (not a hand-rolled Navbar+Footer) so the Sidebar is
// present from the very first paint — previously the Sidebar popped in the
// instant real data resolved, a visible layout shift (Phase 15 audit fix).
export default function DashboardLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-6 py-6 sm:py-8" aria-hidden="true">
          <div className="rounded-card border border-ink/10 bg-bg-surface p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-ink/10" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-56 animate-pulse rounded bg-ink/10" />
                <div className="h-4 w-72 max-w-full animate-pulse rounded bg-ink/5" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="h-16 animate-pulse rounded-control bg-ink/5" />
              <div className="h-16 animate-pulse rounded-control bg-ink/5" />
              <div className="h-16 animate-pulse rounded-control bg-ink/5" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="h-40 animate-pulse rounded-card bg-bg-surface" />
              <div className="h-56 animate-pulse rounded-card bg-bg-surface" />
            </div>
            <div className="flex flex-col gap-6">
              <div className="h-56 animate-pulse rounded-card bg-bg-surface" />
              <div className="h-32 animate-pulse rounded-card bg-bg-surface" />
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
