import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TeamCrest } from "@/components/media/TeamCrest";
import { MatchCountdown } from "./MatchCountdown";
import { RecentFormStrip } from "./RecentFormStrip";
import { SoccerBallIcon } from "./MatchIcons";
import type { MatchSummary } from "@/lib/matches/matches";

export interface MatchOverviewCardProps {
  nextMatch: MatchSummary | null;
  recentResults: MatchSummary[];
}

/**
 * The Match Centre's "Overview" tab — a crest-vs-crest hero with a live
 * countdown, plus Manchester United's real recent form underneath. The
 * opponent's real crest (via TeamCrest, hotlinked from API-Football using
 * `nextMatch.opponentExternalRef` — captured at fixture-sync time, see
 * matches.ts) rather than an initials-only stand-in. No League Position
 * table (no standings sync exists yet — showing one would mean fabricating
 * table positions this app has never fetched from anywhere).
 */
export function MatchOverviewCard({ nextMatch, recentResults }: MatchOverviewCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-6 text-center">
        {nextMatch ? (
          <>
            {nextMatch.competition ? <Badge tone="outline">{nextMatch.competition}</Badge> : null}

            <div className="flex w-full items-center justify-center gap-6 sm:gap-12">
              <div className="flex flex-1 flex-col items-center gap-2">
                <TeamCrest variant="manUtd" name="Manchester United" size={88} />
                <span className="font-display text-sm font-bold text-white sm:text-base">Manchester United</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <MatchCountdown kickoffAtIso={nextMatch.kickoffAt} />
                <span className="text-text-muted">
                  <SoccerBallIcon size={20} />
                </span>
              </div>

              <div className="flex flex-1 flex-col items-center gap-2">
                <TeamCrest variant="opponent" externalRef={nextMatch.opponentExternalRef} name={nextMatch.opponentName} size={88} />
                <span className="font-display text-sm font-bold text-white sm:text-base">{nextMatch.opponentName}</span>
              </div>
            </div>

            <p className="text-sm text-text-muted">
              {new Date(nextMatch.kickoffAt).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              &middot;{" "}
              {new Date(nextMatch.kickoffAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              {nextMatch.venue ? ` · ${nextMatch.venue}` : ""}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={`/matches/${nextMatch.id}`}>Match Preview</Button>
              <Button href={`/matches/${nextMatch.id}`} variant="secondary">
                Make Prediction
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6">
            <p className="text-sm text-text-muted">No upcoming fixture is scheduled right now.</p>
            <p className="mt-1 text-xs text-text-muted">
              Our fixture data hasn&apos;t reached the new season yet — recent results are still
              all below.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Recent Form</p>
          {recentResults.length > 0 ? (
            <span className="text-xs text-text-muted">
              {recentResults.length} match{recentResults.length === 1 ? "" : "es"} on record
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <TeamCrest variant="manUtd" name="Manchester United" size={32} />
          <span className="text-sm font-semibold text-white">Man Utd</span>
          <RecentFormStrip matches={recentResults} />
        </div>
        {recentResults.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No recent results yet.</p>
        ) : (
          <Link
            href="/matches?tab=results"
            className="mt-3 inline-block text-xs font-medium text-red-primary hover:text-red-hover"
          >
            See all {recentResults.length} results &rarr;
          </Link>
        )}
      </Card>
    </div>
  );
}
