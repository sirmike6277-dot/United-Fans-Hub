import { AppShell } from "@/components/layout/AppShell";

export default function FanRoomsLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-4 py-6 sm:py-8">
          <div className="h-7 w-32 animate-pulse rounded bg-white/10" aria-hidden="true" />
          <div className="h-11 w-full max-w-md animate-pulse rounded-control bg-bg-elevated" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-card border border-white/10 bg-bg-surface" aria-hidden="true" />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
