import { AppShell } from "@/components/layout/AppShell";

export default function AdminLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-4 py-6 sm:py-8">
          <div className="h-7 w-24 animate-pulse rounded bg-white/10" aria-hidden="true" />
          <div className="h-11 w-full max-w-md animate-pulse rounded-control bg-bg-elevated" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-card bg-white/5" />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
