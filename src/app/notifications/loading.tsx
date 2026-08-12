import { AppShell } from "@/components/layout/AppShell";
import { NotificationsSkeleton } from "@/components/notifications/NotificationsSkeleton";

// Wrapped in AppShell, with a generic rail placeholder matching the real
// page's TopFansWidget+quote rail width, so nothing shifts once real data
// resolves (Phase 15 audit fix — see dashboard/loading.tsx).
export default function NotificationsLoading() {
  return (
    <AppShell
      rail={
        <div className="flex flex-col gap-6" aria-hidden="true">
          <div className="h-40 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-24 animate-pulse rounded-card bg-bg-surface" />
        </div>
      }
    >
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 max-w-2xl pt-6 sm:pt-8" aria-hidden="true">
          <div className="h-[240px] animate-pulse rounded-card bg-bg-surface sm:h-[300px]" />
        </div>
        <div className="flex max-w-2xl flex-col gap-4 pb-6 sm:pb-8" aria-hidden="true">
          <div className="flex justify-end">
            <div className="h-9 w-36 animate-pulse rounded-control bg-bg-elevated" />
          </div>
          <div className="flex flex-col gap-3">
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
