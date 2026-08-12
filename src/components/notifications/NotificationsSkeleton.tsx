export function NotificationsSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-card border border-white/10 bg-bg-surface px-4 py-3" aria-hidden="true">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}
