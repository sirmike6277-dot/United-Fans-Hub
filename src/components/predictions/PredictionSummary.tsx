import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LockIcon } from "./PredictionIcons";
import type { Prediction } from "@/lib/predictions/predictions";

export interface PredictionSummaryProps {
  prediction: Prediction;
  opponentName: string;
  isHome: boolean;
  locked: boolean;
  onEdit?: () => void;
}

export function PredictionSummary({ prediction, opponentName, isHome, locked, onEdit }: PredictionSummaryProps) {
  // predicted_home_score/predicted_away_score are literal home/away
  // values — swap into "Man Utd vs Opponent" display order the same way
  // PredictionForm/ScoreDisplay already do.
  const manUtdScore = isHome ? prediction.predictedHomeScore : prediction.predictedAwayScore;
  const opponentScore = isHome ? prediction.predictedAwayScore : prediction.predictedHomeScore;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Your prediction</p>
        {locked ? (
          <Badge tone="outline" className="flex items-center gap-1">
            <LockIcon size={12} />
            Prediction Locked
          </Badge>
        ) : (
          <Badge tone="red">Editable</Badge>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 text-lg">
        <span className={isHome ? "font-semibold text-ink" : "text-text-body"}>Man Utd</span>
        <span className="font-display font-bold text-ink">
          {manUtdScore}&ndash;{opponentScore}
        </span>
        <span className={!isHome ? "font-semibold text-ink" : "text-text-body"}>{opponentName}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-control border border-ink/10 bg-bg-elevated p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">First scorer</p>
          <p className="mt-1 text-sm text-ink">{prediction.predictedFirstScorerName ?? "No prediction"}</p>
        </div>
        <div className="rounded-control border border-ink/10 bg-bg-elevated p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Man of the Match</p>
          <p className="mt-1 text-sm text-ink">{prediction.predictedMotmName ?? "No prediction"}</p>
          <p className="mt-1 text-[11px] text-text-muted">Not scored yet</p>
        </div>
      </div>

      {prediction.score ? (
        <div className="rounded-control border border-red-primary/40 bg-red-primary/10 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Points earned</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{prediction.score.pointsAwarded}</p>
        </div>
      ) : null}

      {!locked && onEdit ? (
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          Edit Prediction
        </Button>
      ) : null}
    </div>
  );
}
