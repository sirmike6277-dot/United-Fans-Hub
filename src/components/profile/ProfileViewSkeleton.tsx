/**
 * Route-level loading placeholder shaped exactly like <ProfileView> (cover,
 * avatar, name/username, action slot, badge row, fields grid) — shared by
 * /profile and /profile/[profileId], the only two routes that render
 * ProfileView, so both loading.tsx files stay in sync with a single source
 * of shape instead of two hand-copied skeletons drifting apart.
 */
export function ProfileViewSkeleton() {
  return (
    <main className="flex-1 bg-bg-void pb-20" aria-hidden="true">
      <div className="h-40 w-full animate-pulse bg-bg-elevated sm:h-56" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 flex items-end gap-4 sm:-mt-16">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-full border-4 border-bg-void bg-bg-elevated sm:h-32 sm:w-32" />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pb-2">
            {/* min-w-0 lets this shrink below its content's natural size —
                without it, the fixed-width bars below (unlike real text,
                which can wrap) forced the row past the viewport at 390px. */}
            <div className="min-w-0 space-y-2">
              <div className="h-6 w-28 max-w-full animate-pulse rounded bg-white/10" />
              <div className="h-4 w-20 max-w-full animate-pulse rounded bg-white/5" />
            </div>
            <div className="h-9 w-24 shrink-0 animate-pulse rounded-control bg-white/5" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-white/5" />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-20 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-20 animate-pulse rounded-card bg-bg-surface" />
        </div>
      </div>
    </main>
  );
}
