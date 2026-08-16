import type { ReactNode } from "react";

export interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
  /** Optional icon shown beside the value (e.g. the fan level star) — omit for a plain text tile. */
  icon?: ReactNode;
}

/**
 * Small bordered stat block — extracted from PredictionStatsCard (Phase 8B)
 * so Dashboard/Profile can show the same "Fan Points"/"Fan Level"/"Rank"
 * tiles without a second hand-copied implementation. PredictionStatsCard
 * itself is left untouched (still works, no reason to churn it).
 */
export function StatTile({ label, value, caption, icon }: StatTileProps) {
  return (
    <div className="rounded-control border border-ink/10 bg-bg-elevated p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 font-display text-lg font-bold text-ink">
        {icon}
        {value}
      </p>
      {caption ? <p className="mt-0.5 text-[11px] text-text-muted">{caption}</p> : null}
    </div>
  );
}
