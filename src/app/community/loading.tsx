import { AppShell } from "@/components/layout/AppShell";
import { PostCardSkeleton } from "@/components/community/PostCardSkeleton";

// Wrapped in AppShell, with a generic rail placeholder, so neither the
// Sidebar nor the content width shifts once the real rail (CommunityRail)
// mounts — see dashboard/loading.tsx for the same class of fix (Phase 15 audit).
export default function CommunityLoading() {
  return (
    <AppShell
      rail={
        <div className="flex flex-col gap-6" aria-hidden="true">
          <div className="h-40 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-32 animate-pulse rounded-card bg-bg-surface" />
        </div>
      }
    >
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 max-w-2xl pt-6 sm:pt-8" aria-hidden="true">
          <div className="h-[240px] animate-pulse rounded-card bg-bg-surface sm:h-[300px]" />
        </div>
        <div className="flex max-w-2xl flex-col gap-4 pb-6 sm:pb-8" aria-hidden="true">
          <div className="h-28 animate-pulse rounded-card bg-bg-surface" />
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      </main>
    </AppShell>
  );
}
