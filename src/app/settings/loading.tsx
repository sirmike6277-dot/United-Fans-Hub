import { AppShell } from "@/components/layout/AppShell";

// Mirrors the real page's left-tab-nav + right-panel layout — see
// dashboard/loading.tsx for why every gated route gets its own tailored
// skeleton rather than falling through to the root app/loading.tsx fallback.
export default function SettingsLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-6 py-6 sm:py-8" aria-hidden="true">
          <div className="h-6 w-28 animate-pulse rounded bg-white/10" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-control bg-white/5" />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-card border border-white/10 bg-bg-surface" />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
