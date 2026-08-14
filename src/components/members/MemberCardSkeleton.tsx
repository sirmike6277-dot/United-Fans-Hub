import { Card } from "@/components/ui/Card";

/** Loading placeholder shown while a search or "Load more" page is in flight. */
export function MemberCardSkeleton() {
  return (
    <Card className="!p-4 flex items-center gap-3 sm:!p-5" aria-hidden="true">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-ink/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 animate-pulse rounded bg-ink/10" />
        <div className="h-3 w-20 animate-pulse rounded bg-ink/5" />
      </div>
    </Card>
  );
}
