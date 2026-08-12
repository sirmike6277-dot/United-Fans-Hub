import { Card } from "@/components/ui/Card";
import { PullQuote } from "@/components/ui/PullQuote";
import { MatchCard } from "@/components/matches/MatchCard";
import { TopFansWidget } from "@/components/dashboard/TopFansWidget";
import type { MatchSummary } from "@/lib/matches/matches";
import type { LeaderboardEntry } from "@/lib/leaderboard/leaderboard";

export interface CommunityRailProps {
  nextMatch: MatchSummary | null;
  topFans: LeaderboardEntry[];
  currentUserId: string;
}

/**
 * Right-hand widget rail for the Community feed — the column the reference
 * designs give every feed page and this one never had, so the feed sat
 * alone in a phone-width column with nothing beside it. Both widgets reuse
 * data already fetched elsewhere (dashboard's next-match + top-fans queries)
 * rather than inventing new "trending" data this app has no way to compute.
 */
export function CommunityRail({ nextMatch, topFans, currentUserId }: CommunityRailProps) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-text-muted">
          Next Match
        </h2>
        {nextMatch ? (
          <MatchCard match={nextMatch} />
        ) : (
          <Card className="text-center text-sm text-text-muted">
            No upcoming fixture scheduled right now.
          </Card>
        )}
      </section>

      <TopFansWidget entries={topFans} currentUserId={currentUserId} />

      <Card>
        <PullQuote
          quote="You can change your wife, your politics, your religion, but never, ever can you change your favourite football team."
          attribution="Eric Cantona"
        />
      </Card>
    </div>
  );
}
