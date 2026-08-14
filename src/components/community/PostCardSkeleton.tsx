import { Card } from "@/components/ui/Card";

/** Loading placeholder shown while a "Load more" page is in flight. */
export function PostCardSkeleton() {
  return (
    <Card className="!p-4 sm:!p-5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-ink/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 animate-pulse rounded bg-ink/10" />
          <div className="h-3 w-20 animate-pulse rounded bg-ink/5" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3.5 w-full animate-pulse rounded bg-ink/5" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-ink/5" />
      </div>
    </Card>
  );
}
