import { ClubEmblem } from "@/components/media/ClubEmblem";

export interface BrandedLoaderProps {
  /** Fills the viewport height — the default, for a full route transition. Set false for a loader embedded inside an already-sized panel. */
  fullHeight?: boolean;
  label?: string;
}

/**
 * The emblem-centred loading state used for full route transitions — a
 * spinning red ring around the real Manchester United crest, rather than a
 * generic spinner. Deliberately not used to replace every segment's own
 * tailored skeleton (see e.g. dashboard/loading.tsx) — those already mirror
 * their real page's layout, which is a better loading state than a generic
 * spinner where one exists. This fills the gap those don't cover: the
 * top-level app/loading.tsx boundary, and anywhere else a page has no
 * layout worth skeleton-mirroring yet.
 */
export function BrandedLoader({ fullHeight = true, label = "Loading" }: BrandedLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 bg-bg-void ${fullHeight ? "min-h-[60vh]" : ""}`}
      role="status"
      aria-label={label}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span
          className="absolute inset-0 animate-spin rounded-full border-2 border-red-primary/25 border-t-red-primary"
          aria-hidden="true"
        />
        <ClubEmblem size={44} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  );
}
