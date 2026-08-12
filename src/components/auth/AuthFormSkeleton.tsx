/**
 * Route-level loading placeholder for the auth pages (login/signup/
 * forgot-password/reset-password) — dropped in as the `children` of
 * <AuthLayout> exactly like the real <AuthHeader>+form+<AuthFooter>
 * composition, so the split-screen shell (and <AuthVisual />) never shifts
 * once the real content mounts. Generic gray blocks rather than exact
 * per-page copy, since the heading/field count differ slightly page to
 * page — approximate shape is enough to avoid a jarring layout jump.
 */
export function AuthFormSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8" aria-hidden="true">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="h-7 w-40 animate-pulse rounded bg-white/10" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-56 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-white/5" />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-11 w-full animate-pulse rounded-control bg-white/5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
          <div className="h-11 w-full animate-pulse rounded-control bg-white/5" />
        </div>
        <div className="h-14 w-full animate-pulse rounded-control bg-white/10" />
      </div>

      <div className="h-4 w-48 max-w-full animate-pulse self-center rounded bg-white/5" />
    </div>
  );
}
