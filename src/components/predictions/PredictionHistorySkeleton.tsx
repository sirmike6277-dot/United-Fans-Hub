export function PredictionHistorySkeleton() {
  return (
    <div className="rounded-card border border-ink/10 bg-bg-surface p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-ink/10" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-ink/10" />
      </div>
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-ink/10" />
      <div className="mt-2 h-3 w-28 animate-pulse rounded bg-ink/5" />
      <div className="mt-3 h-3 w-36 animate-pulse rounded bg-ink/5" />
    </div>
  );
}
