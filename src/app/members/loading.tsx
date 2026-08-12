import { AppShell } from "@/components/layout/AppShell";
import { MemberCardSkeleton } from "@/components/members/MemberCardSkeleton";

// Wrapped in AppShell so the Sidebar matches the real page from the first
// paint (Phase 15 audit fix). The banner placeholder is deliberately a
// plain block, not a copy of SectionBanner's specific imagery/quote — a
// skeleton shouldn't need to track that component's own content.
export default function MembersLoading() {
  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 pt-6 sm:pt-8" aria-hidden="true">
          <div className="h-[240px] animate-pulse rounded-card bg-bg-surface sm:h-[300px]" />
        </div>
        <div className="flex flex-col gap-4 pb-6 sm:pb-8" aria-hidden="true">
          <div className="h-11 w-full max-w-md animate-pulse rounded-control bg-bg-elevated" />
          <div className="flex flex-col gap-3">
            <MemberCardSkeleton />
            <MemberCardSkeleton />
            <MemberCardSkeleton />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
