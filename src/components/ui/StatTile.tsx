export interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
}

/**
 * Small bordered stat block — extracted from PredictionStatsCard (Phase 8B)
 * so Dashboard/Profile can show the same "Fan Points"/"Fan Level"/"Rank"
 * tiles without a second hand-copied implementation. PredictionStatsCard
 * itself is left untouched (still works, no reason to churn it).
 */
export function StatTile({ label, value, caption }: StatTileProps) {
  return (
    <div className="rounded-control border border-white/10 bg-bg-elevated p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
      {caption ? <p className="mt-0.5 text-[11px] text-text-muted">{caption}</p> : null}
    </div>
  );
}
