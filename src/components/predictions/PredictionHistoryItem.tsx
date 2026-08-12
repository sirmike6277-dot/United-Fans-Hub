import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMatchDateTime } from "@/lib/format";
import { isMatchLocked } from "@/lib/predictions/predictions";
import type { PredictionHistoryEntry } from "@/lib/predictions/predictions";

export function PredictionHistoryItem({ entry }: { entry: PredictionHistoryEntry }) {
  const locked = isMatchLocked(entry.kickoffAt);
  const manUtdScore = entry.isHome ? entry.predictedHomeScore : entry.predictedAwayScore;
  const opponentScore = entry.isHome ? entry.predictedAwayScore : entry.predictedHomeScore;
  const actualManUtd = entry.isHome ? entry.homeScore : entry.awayScore;
  const actualOpponent = entry.isHome ? entry.awayScore : entry.homeScore;

  return (
    <Link href={`/matches/${entry.matchId}`} className="block">
      <Card className="!p-4 transition-colors hover:border-white/30 sm:!p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {entry.competition ? (
              <Badge tone="outline" className="!px-1.5 !py-0 text-[10px]">
                {entry.competition}
              </Badge>
            ) : null}
            <Badge tone="outline" className="!px-1.5 !py-0 text-[10px]">
              {entry.isHome ? "Home" : "Away"}
            </Badge>
          </div>
          {locked ? (
            entry.score ? (
              <Badge tone="red">{entry.score.pointsAwarded} pts</Badge>
            ) : (
              <Badge tone="outline">Locked</Badge>
            )
          ) : (
            <Badge tone="red">Editable</Badge>
          )}
        </div>

        <p className="mt-3 font-display font-semibold text-white">Man Utd vs {entry.opponentName}</p>
        <time dateTime={entry.kickoffAt} suppressHydrationWarning className="text-xs text-text-muted">
          {formatMatchDateTime(entry.kickoffAt)}
        </time>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Your prediction: <span className="text-text-body">{manUtdScore}&ndash;{opponentScore}</span>
          </span>
          {entry.matchStatus === "finished" ? (
            <span className="text-text-muted">
              Actual: <span className="text-text-body">{actualManUtd}&ndash;{actualOpponent}</span>
            </span>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
