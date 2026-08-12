import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { MatchCountdown } from "./MatchCountdown";
import { RecentFormStrip } from "./RecentFormStrip";
import { SoccerBallIcon } from "./MatchIcons";
import type { MatchSummary } from "@/lib/matches/matches";

export interface MatchOverviewCardProps {
  nextMatch: MatchSummary | null;
  recentResults: MatchSummary[];
}

/**
 * The Match Centre's "Overview" tab — a crest-vs-name hero with a live
 * countdown, plus Manchester United's real recent form underneath. No
 * opponent crest (see ClubEmblem's own no-fake-emblem rule — this app has
 * no licensed artwork for any club but Manchester United) and no League
 * Position table (no standings sync exists yet — showing one would mean
 * fabricating table positions this app has never fetched from anywhere).
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
                <ClubEmblem size={64} />
                <span className="font-display text-sm font-bold text-white sm:text-base">Manchester United</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <MatchCountdown kickoffAtIso={nextMatch.kickoffAt} />
                <span className="text-text-muted">
                  <SoccerBallIcon size={20} />
                </span>
              </div>

              <div className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-bg-elevated text-lg font-bold text-text-muted">
                  {nextMatch.opponentName.charAt(0)}
                </div>
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
          <p className="py-6 text-sm text-text-muted">No upcoming fixture is scheduled right now.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Recent Form</p>
        <div className="flex items-center gap-3">
          <ClubEmblem size={24} />
          <span className="text-sm font-semibold text-white">Man Utd</span>
          <RecentFormStrip matches={recentResults} />
        </div>
        {recentResults.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No recent results yet.</p>
        ) : (
          <Link href="/matches" className="mt-3 inline-block text-xs font-medium text-red-primary hover:text-red-hover">
            See all results below
          </Link>
        )}
      </Card>
    </div>
  );
}
