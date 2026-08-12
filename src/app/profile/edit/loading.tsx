import { AppShell } from "@/components/layout/AppShell";

// Wrapped in AppShell so the Sidebar matches the real page from the first
// paint (Phase 15 audit fix — see dashboard/loading.tsx).
export default function EditProfileLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void py-12">
        <div className="max-w-3xl" aria-hidden="true">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-white/5" />

          <div className="mt-8 flex flex-col gap-5">
            <div className="h-32 w-full animate-pulse rounded-card bg-bg-surface" />
            <div className="-mt-10 h-20 w-20 animate-pulse rounded-full border-4 border-bg-void bg-bg-elevated" />

            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                <div className="h-11 w-full animate-pulse rounded-control bg-bg-elevated" />
              </div>
            ))}

            <div className="h-14 w-40 animate-pulse rounded-control bg-white/10" />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
