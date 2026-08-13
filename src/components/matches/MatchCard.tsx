import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { ScoreDisplay } from "./ScoreDisplay";
import { LocationIcon } from "./MatchIcons";
import { formatMatchDateTime } from "@/lib/format";
import type { MatchSummary } from "@/lib/matches/matches";

export interface MatchCardProps {
  match: MatchSummary;
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Link
      href={`/matches/${match.id}`}
      aria-label={`${match.isHome ? "Manchester United vs" : "Manchester United at"} ${match.opponentName}, ${match.competition ?? "match"} details`}
      className="block"
    >
      <Card className="!p-4 transition-colors hover:border-white/30 sm:!p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {match.competition ? (
              <Badge tone="outline" className="!px-1.5 !py-0 text-[10px]">
                {match.competition}
              </Badge>
            ) : null}
            <Badge tone="outline" className="!px-1.5 !py-0 text-[10px]">
              {match.isHome ? "Home" : "Away"}
            </Badge>
          </div>
          <MatchStatusBadge status={match.status} />
        </div>

        <div className="mt-4">
          <ScoreDisplay match={match} />
        </div>

        {/* Every status shows this now — a real bug this fixes: this card
            previously showed no date at all for a finished/live match (see
            ScoreDisplay's doc comment), which is every match this app
            currently has, so no fixture card ever showed when it was
            actually played. formatMatchDateTime already includes the year
            whenever it differs from today's, so this needs no extra logic
            of its own to "show the year" — it already does. */}
        <time dateTime={match.kickoffAt} className="mt-3 block text-center text-xs text-text-muted">
          {formatMatchDateTime(match.kickoffAt)}
        </time>

        {match.venue ? (
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-text-muted">
            <LocationIcon size={14} />
            <span>{match.venue}</span>
          </div>
        ) : null}
      </Card>
    </Link>
  );
}
