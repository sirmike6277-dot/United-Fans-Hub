import { Card } from "@/components/ui/Card";

/** Loading placeholder — shown via /matches's loading.tsx while the server fetch (and possible lazy-revalidation sync) is in flight. */
export function MatchCardSkeleton() {
  return (
    <Card className="!p-4 sm:!p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
      </div>
      <div className="mt-4 flex justify-center">
        <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
      </div>
      <div className="mt-3 flex justify-center">
        <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
      </div>
    </Card>
  );
}
