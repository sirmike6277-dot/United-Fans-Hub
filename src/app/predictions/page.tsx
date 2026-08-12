import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PredictionHistoryList } from "@/components/predictions/PredictionHistoryList";
import { PredictionStatsCard } from "@/components/predictions/PredictionStatsCard";
import { LeaderboardSection } from "@/components/leaderboard/LeaderboardSection";
import { SectionBanner } from "@/components/layout/SectionBanner";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { PullQuote } from "@/components/ui/PullQuote";
import { MatchCard } from "@/components/matches/MatchCard";
import { fetchPredictionHistory, derivePredictionStats } from "@/lib/predictions/predictions";
import { fetchUpcomingMatches } from "@/lib/matches/matches";
import {
  fetchFanLeaderboard,
  fetchLeaderboardSize,
  fetchMyLeaderboardProfile,
  fetchMyRank,
  LEADERBOARD_PAGE_SIZE,
} from "@/lib/leaderboard/leaderboard";

export const metadata: Metadata = {
  title: "Predictions — United Fans Hub",
};

export default async function PredictionsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims.sub;

  if (!profileId) redirect("/login");

  const { data: club } = await supabase.from("clubs").select("id").eq("slug", "manchester-united").single();

  // Independent data sources, fetched in parallel — one failing must not
  // take any of the others down with it (see PredictionStatsCard/
  // LeaderboardSection, which each degrade their own piece gracefully).
  const [
    { predictions, error: historyError },
    { profile: myProfile, error: profileError },
    { total: totalParticipants, error: totalError },
    { entries: leaderboardEntries, error: leaderboardError },
    { matches: upcoming },
  ] = await Promise.all([
    fetchPredictionHistory(supabase, { profileId }),
    fetchMyLeaderboardProfile(supabase, profileId),
    fetchLeaderboardSize(supabase),
    fetchFanLeaderboard(supabase, { from: 0, to: LEADERBOARD_PAGE_SIZE - 1 }),
    club ? fetchUpcomingMatches(supabase, { clubId: club.id, limit: 1 }) : Promise.resolve({ matches: [], error: null }),
  ]);

  // Rank depends on already knowing our own fan_points, so it can only be
  // attempted once that read succeeds — never guessed at or defaulted.
  let rank: number | null = null;
  let rankError: string | null = null;
  if (myProfile) {
    const rankResult = await fetchMyRank(supabase, { profileId, fanPoints: myProfile.fanPoints });
    rank = rankResult.error ? null : rankResult.rank;
    rankError = rankResult.error;
  }

  // totalParticipants is supplementary display context (an "of N fans"
  // caption), not core ranking/points data — if its own trivial count
  // query fails, fall back to what we know for certain (this page's own
  // successfully-fetched rows) rather than showing a dedicated error
  // banner for a non-critical number. The failure is still not swallowed:
  // it's logged server-side for visibility.
  if (totalError) {
    console.error("fetchLeaderboardSize failed:", totalError);
  }
  const displayedTotalParticipants = totalError ? Math.max(leaderboardEntries.length, 1) : totalParticipants;

  const nextMatch = upcoming[0] ?? null;

  return (
    <AppShell
      rail={
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-text-muted">
              Next To Predict
            </h2>
            {nextMatch ? (
              <MatchCard match={nextMatch} />
            ) : (
              <Card className="text-center text-sm text-text-muted">No upcoming fixture right now.</Card>
            )}
          </section>
          <Card>
            <PullQuote
              quote="Football is a simple game based on the giving and taking of passes, of controlling the ball and of making yourself available to receive a pass."
              attribution="Sir Matt Busby"
            />
          </Card>
        </div>
      }
    >
      <main className="flex-1 bg-bg-void">
        <div className="flex max-w-3xl flex-col gap-6 py-6 sm:py-8">
          <SectionBanner
            imageSrc="/images/stadium/old-trafford-reds-mural.jpg"
            imageAlt="The 'THE REDS GO MARCHING ON' mural on Old Trafford's forecourt wall"
            kicker="Predictions"
            title="Back your judgement. Climb the table."
            subtitle="Predict results, earn points, and climb the rankings."
            quote={{
              quote: "Form is temporary, class is permanent.",
              attribution: "Sir Alex Ferguson",
            }}
          />

          <PredictionStatsCard
            fanPoints={myProfile?.fanPoints ?? null}
            fanLevel={myProfile?.fanLevel ?? null}
            profileError={profileError}
            rank={rank}
            rankError={rankError}
            totalParticipants={displayedTotalParticipants}
            stats={historyError ? null : derivePredictionStats(predictions)}
            statsError={historyError}
          />

          <Tabs
            tabs={[
              {
                key: "leaderboard",
                label: "Leaderboard",
                content: (
                  <LeaderboardSection
                    currentUserId={profileId}
                    initialEntries={leaderboardEntries}
                    initialError={leaderboardError}
                    initialHasMore={leaderboardEntries.length === LEADERBOARD_PAGE_SIZE}
                    totalParticipants={displayedTotalParticipants}
                  />
                ),
              },
              {
                key: "history",
                label: "Your History",
                content: <PredictionHistoryList predictions={predictions} error={historyError} />,
              },
            ]}
          />
        </div>
      </main>
    </AppShell>
  );
}
