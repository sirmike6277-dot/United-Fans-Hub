import { TrophyIcon } from "./PredictionIcons";
import { PredictionHistoryItem } from "./PredictionHistoryItem";
import type { PredictionHistoryEntry } from "@/lib/predictions/predictions";

export interface PredictionHistoryListProps {
  predictions: PredictionHistoryEntry[];
  error: string | null;
}

export function PredictionHistoryList({ predictions, error }: PredictionHistoryListProps) {
  if (error) {
    return (
      <div className="rounded-card border border-ink/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
        {error}
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-ink/10 bg-bg-surface p-10 text-center">
        <TrophyIcon size={28} />
        <p className="font-display text-lg font-semibold text-ink">No predictions yet</p>
        <p className="text-sm text-text-muted">
          Head to an upcoming Man Utd fixture in Match Centre to make your first prediction.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {predictions.map((entry) => (
        <PredictionHistoryItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
