import { Card } from "@/components/ui/Card";
import { TrophyIcon } from "./PredictionIcons";
import type { PredictionStats } from "@/lib/predictions/predictions";

export interface PredictionStatsCardProps {
  /** Null only when the profile read itself failed — see profileError. Never client-supplied. */
  fanPoints: number | null;
  fanLevel: number | null;
  profileError: string | null;
  /** Null when the rank query failed (see rankError) or couldn't be attempted because profileError is set. */
  rank: number | null;
  rankError: string | null;
  totalParticipants: number;
  /** Null only when the underlying prediction history fetch itself failed — see statsError. */
  stats: PredictionStats | null;
  statsError: string | null;
}

interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
}

function StatTile({ label, value, caption }: StatTileProps) {
  return (
    <div className="rounded-control border border-white/10 bg-bg-elevated p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
      {caption ? <p className="mt-0.5 text-[11px] text-text-muted">{caption}</p> : null}
    </div>
  );
}

/**
 * "Your Stats" — the only place richer prediction-performance numbers are
 * shown, and only for the signed-in viewer. fanPoints/fanLevel/rank must
 * all come from fresh authoritative reads (see leaderboard.ts) — this
 * component only renders what it's given, it never queries or trusts
 * anything client-supplied itself.
 */
export function PredictionStatsCard({
  fanPoints,
  fanLevel,
  profileError,
  rank,
  rankError,
  totalParticipants,
  stats,
  statsError,
}: PredictionStatsCardProps) {
  const hasCompleted = (stats?.completedPredictions ?? 0) > 0;

  return (
    <Card>
      <div className="flex items-center gap-2">
        <TrophyIcon />
        <h2 className="font-display text-lg font-bold uppercase text-white">Your Stats</h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Fan Points"
          value={fanPoints === null ? "—" : fanPoints.toLocaleString()}
          caption={profileError ?? undefined}
        />
        <StatTile
          label="Fan Level"
          value={fanLevel === null ? "—" : `Level ${fanLevel}`}
          caption={profileError ?? undefined}
        />
        <StatTile
          label="Rank"
          // 0 fan_points means nothing's actually been earned yet — the
          // fan_points-desc/id-asc tie-break still returns *a* number, but
          // showing it as "your rank" would fabricate a signal nobody
          // earned (see LeaderboardRow's matching note).
          value={rank && fanPoints && fanPoints > 0 ? `#${rank}` : "—"}
          caption={rankError ?? profileError ?? `of ${totalParticipants.toLocaleString()} fans`}
        />
        <StatTile
          label="Predictions Made"
          value={stats ? String(stats.totalPredictions) : "—"}
          caption={statsError ?? undefined}
        />
        <StatTile
          label="Correct Predictions"
          value={stats && hasCompleted ? String(stats.correctPredictions) : "—"}
          caption={statsError ?? (stats && hasCompleted ? `of ${stats.completedPredictions} completed` : "No completed predictions yet")}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Recent Form</p>
        {statsError ? (
          <p className="mt-2 text-sm text-text-muted">{statsError}</p>
        ) : !stats || stats.recentForm.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            {!stats || stats.totalPredictions === 0
              ? "Make your first prediction to start building a record."
              : "No completed predictions yet — form will appear once a match settles."}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stats.recentForm.map((entry) => (
              <span
                key={entry.matchId}
                title={`vs ${entry.opponentName} — ${entry.pointsAwarded} pt${entry.pointsAwarded === 1 ? "" : "s"}${entry.isCorrectResult ? ", correct result" : ""}`}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  entry.isCorrectResult ? "bg-red-primary text-white" : "bg-white/10 text-text-muted"
                }`}
              >
                {entry.pointsAwarded}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
