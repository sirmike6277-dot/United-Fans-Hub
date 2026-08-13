/**
 * Route-level loading placeholder shaped like <ProfileView> — shared by
 * /profile and /profile/[profileId], the only two routes that render
 * ProfileView, so both loading.tsx files stay in sync with a single source
 * of shape instead of two hand-copied skeletons drifting apart.
 *
 * ITEM 2 fix: this had drifted from the real ProfileView.tsx markup
 * (shorter banner with no `lg` step, narrower container, smaller avatar, a
 * 3-column stat grid instead of the real 4-column one, and it stopped
 * entirely after the badge row — no follower/following row, no level-
 * progress bar, no Tabs placeholder) enough to cause a visible jump the
 * instant real content replaced it. Every block below now mirrors
 * ProfileView's actual classes exactly, not an approximation.
 */
export function ProfileViewSkeleton() {
  return (
    <main className="flex-1 bg-bg-void pb-20" aria-hidden="true">
      <div className="h-56 w-full animate-pulse bg-bg-elevated sm:h-72 lg:h-80" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
          <div className="h-28 w-28 shrink-0 animate-pulse rounded-full border-4 border-bg-void bg-bg-elevated sm:h-36 sm:w-36" />
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pb-2">
            <div className="min-w-0 space-y-2">
              <div className="h-7 w-40 max-w-full animate-pulse rounded bg-white/10" />
              <div className="h-4 w-24 max-w-full animate-pulse rounded bg-white/5" />
            </div>
            <div className="h-9 w-24 shrink-0 animate-pulse rounded-control bg-white/5" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-white/5" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-white/5" />
        </div>

        <div className="mt-6 h-2.5 max-w-md animate-pulse rounded-full bg-white/5" />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-4">
          <div className="h-20 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-20 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-20 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-20 animate-pulse rounded-card bg-bg-surface" />
        </div>

        <div className="mt-10 flex gap-4 border-b border-white/10 pb-2.5">
          <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-24 animate-pulse rounded-card bg-bg-surface" />
          <div className="h-24 animate-pulse rounded-card bg-bg-surface" />
        </div>
      </div>
    </main>
  );
}
