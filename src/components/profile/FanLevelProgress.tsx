import { Card } from "@/components/ui/Card";
import type { LevelProgress } from "@/lib/achievements/fanLevels";

export interface FanLevelProgressProps {
  progress: LevelProgress;
  fanPoints: number;
}

/**
 * CURRENT LEVEL → CURRENT POINTS → NEXT LEVEL → POINTS REQUIRED →
 * PROGRESSION, in one glanceable card. Every number here comes from the
 * real `fan_levels` ladder and the profile's real `fan_points` (see
 * computeLevelProgress) — never invented, and this component has no write
 * path at all (fan_points/fan_level remain server-controlled exclusively).
 */
export function FanLevelProgress({ progress, fanPoints }: FanLevelProgressProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold text-white">
            Level {progress.currentLevel} — {progress.currentTitle}
          </p>
          <p className="text-sm text-text-muted">{fanPoints.toLocaleString()} fan points</p>
        </div>
        {progress.nextTitle ? (
          <p className="text-right text-xs text-text-muted">
            Next: <span className="text-white">{progress.nextTitle}</span>
          </p>
        ) : (
          <p className="text-right text-xs text-text-muted">Top tier reached</p>
        )}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-red-primary transition-[width]"
          style={{ width: `${progress.progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progress.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progress.nextTitle ? `Progress to ${progress.nextTitle}` : "Top level reached"}
        />
      </div>

      <p className="text-xs text-text-muted">
        {progress.nextLevelMinPoints != null
          ? `${(progress.nextLevelMinPoints - fanPoints).toLocaleString()} points to ${progress.nextTitle}`
          : "You've reached the highest fan level currently available."}
      </p>
    </Card>
  );
}
