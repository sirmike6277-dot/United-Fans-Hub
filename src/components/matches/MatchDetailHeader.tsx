import { ClubEmblem } from "@/components/media/ClubEmblem";
import { Badge } from "@/components/ui/Badge";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { ScoreDisplay } from "./ScoreDisplay";
import { LocationIcon } from "./MatchIcons";
import { formatMatchDateTime } from "@/lib/format";
import type { MatchSummary } from "@/lib/matches/matches";

export interface MatchDetailHeaderProps {
  match: MatchSummary;
}

export function MatchDetailHeader({ match }: MatchDetailHeaderProps) {
  return (
    <header className="rounded-card border border-white/10 bg-bg-surface p-6 text-center sm:p-8">
      <div className="flex items-center justify-center gap-2">
        <ClubEmblem size={28} />
        <div className="flex items-center gap-2">
          {match.competition ? <Badge tone="outline">{match.competition}</Badge> : null}
          <Badge tone="outline">{match.isHome ? "Home" : "Away"}</Badge>
          <MatchStatusBadge status={match.status} />
        </div>
      </div>

      <div className="mt-6">
        <ScoreDisplay match={match} size="lg" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-text-muted">
        <time dateTime={match.kickoffAt}>{formatMatchDateTime(match.kickoffAt)}</time>
        {match.venue ? (
          <span className="flex items-center gap-1.5">
            <LocationIcon size={14} />
            {match.venue}
          </span>
        ) : null}
      </div>
    </header>
  );
}
