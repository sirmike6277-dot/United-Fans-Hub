import { Badge } from "@/components/ui/Badge";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { ScoreDisplay } from "./ScoreDisplay";
import { LocationIcon } from "./MatchIcons";
import { formatMatchDateTime } from "@/lib/format";
import type { MatchSummary } from "@/lib/matches/matches";

export interface MatchDetailHeaderProps {
  match: MatchSummary;
  /** API-Football's numeric team id for the opponent — defaults to `match.opponentExternalRef` (see matches.ts); only pass this to override with a more specific value (e.g. from a published lineup). */
  opponentExternalRef?: string | null;
}

export function MatchDetailHeader({ match, opponentExternalRef = match.opponentExternalRef }: MatchDetailHeaderProps) {
  return (
    <header className="rounded-card border border-ink/10 bg-bg-surface p-6 text-center sm:p-8">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {match.competition ? <Badge tone="outline">{match.competition}</Badge> : null}
        <Badge tone="outline">{match.isHome ? "Home" : "Away"}</Badge>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="mt-6">
        <ScoreDisplay match={match} size="lg" opponentExternalRef={opponentExternalRef} />
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
