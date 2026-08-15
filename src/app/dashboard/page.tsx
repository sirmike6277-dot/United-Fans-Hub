import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { WelcomeRulesModal } from "@/components/onboarding/WelcomeRulesModal";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { ClubEmblem } from "@/components/media/ClubEmblem";
import { MatchCard } from "@/components/matches/MatchCard";
import { CommunityTeaser } from "@/components/dashboard/CommunityTeaser";
import { FanOfMonthTeaser } from "@/components/dashboard/FanOfMonthTeaser";
import { TopFansWidget } from "@/components/dashboard/TopFansWidget";
import { fetchUpcomingMatches } from "@/lib/matches/matches";
import { fetchFeedPage } from "@/lib/community/posts";
import { fetchFanLeaderboard, fetchLeaderboardSize, fetchMyRank } from "@/lib/leaderboard/leaderboard";
import { fetchWinners } from "@/lib/awards/awards";

export const metadata: Metadata = {
  title: "Dashboard — United Fans Hub",
};

/**
 * The authenticated "front door" the reference designs call out as a
 * distinct page from /profile — this app never had one (post-login always
 * landed straight on /profile, a fan-identity page, not a "what's
 * happening right now" page). Every widget here reuses an already-built
 * data-layer function; nothing new was added to the schema or RLS to
 * produce it.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims.sub;

  if (!profileId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level, fan_points, onboarding_seen_at")
    .eq("id", profileId)
    .single();

  if (!profile) redirect("/login");

  const { data: club } = await supabase.from("clubs").select("id").eq("slug", "manchester-united").single();

  const [{ matches: upcoming }, { posts: recentPosts }, { entries: topFans }, { total: totalParticipants }, { winners: awardWinners }] =
    await Promise.all([
      club ? fetchUpcomingMatches(supabase, { clubId: club.id, limit: 1 }) : Promise.resolve({ matches: [], error: null }),
      fetchFeedPage(supabase, { from: 0, to: 2, currentUserId: profileId }),
      fetchFanLeaderboard(supabase, { from: 0, to: 2 }),
      fetchLeaderboardSize(supabase),
      fetchWinners(supabase),
    ]);

  // Most recent winner per category (if any) — fetchWinners() already
  // orders newest-first across every category, so the first match here is
  // the latest one for that specific category. Both render as their own
  // card below — a single merged card previously hid Fan of the Season
  // entirely whenever it had no winner yet, even with a real period live.
  const latestFanOfSeasonWinner = awardWinners.find((w) => w.categoryKey === "fan_of_season") ?? null;
  const latestFanOfMonthWinner = awardWinners.find((w) => w.categoryKey === "fan_of_month") ?? null;

  const { rank, error: rankError } = await fetchMyRank(supabase, {
    profileId,
    fanPoints: profile.fan_points,
  });

  const nextMatch = upcoming[0] ?? null;
  const displayName = profile.display_name || profile.username;

  return (
    <AppShell>
      {profile.onboarding_seen_at === null ? (
        <WelcomeRulesModal profileId={profile.id} logo={<ClubEmblem size={56} />} />
      ) : null}
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-6 py-6 sm:py-8">
          {/* Welcome header + stat row */}
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 opacity-[var(--watermark-opacity-card)]" aria-hidden="true">
              <ClubEmblem size={280} />
            </div>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(218,41,28,0.16),transparent_55%)]"
              aria-hidden="true"
            />

            <div className="relative flex flex-wrap items-center gap-4">
              <Avatar url={profile.avatar_url} name={displayName} size={56} />
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
                  Welcome back, {displayName}
                </h1>
                <p className="text-sm text-text-muted">Here&apos;s what&apos;s happening in the Hub right now.</p>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-3 gap-3">
              <StatTile label="Fan Points" value={profile.fan_points.toLocaleString()} />
              <StatTile label="Fan Level" value={`Level ${profile.fan_level}`} />
              <StatTile
                label="Rank"
                // 0 fan_points means nothing's actually been earned yet — the
                // fan_points-desc/id-asc tie-break still returns *a* number,
                // but showing it as "your rank" would fabricate a signal
                // nobody earned (see LeaderboardRow's matching note).
                value={rankError ? "—" : rank && profile.fan_points > 0 ? `#${rank}` : "—"}
                caption={rankError ?? `of ${totalParticipants.toLocaleString()} fans`}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main column */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold uppercase text-red-primary">Next Match</h2>
                </div>
                {nextMatch ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div className="flex-1">
                      <MatchCard match={nextMatch} />
                    </div>
                    <div className="flex items-center justify-center sm:w-48">
                      <Button href={`/matches/${nextMatch.id}`} className="w-full">
                        Make Your Prediction
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card className="text-center text-sm text-text-muted">
                    No upcoming fixture is scheduled right now.
                    <div className="mt-3">
                      <Button href="/matches" variant="secondary" size="sm">
                        Visit Match Centre
                      </Button>
                    </div>
                  </Card>
                )}
              </section>

              <CommunityTeaser posts={recentPosts} />
            </div>

            {/* Side column */}
            <div className="flex flex-col gap-6">
              <TopFansWidget entries={topFans} currentUserId={profileId} />
              <FanOfMonthTeaser categoryLabel="Fan of the Season" winner={latestFanOfSeasonWinner} />
              <FanOfMonthTeaser categoryLabel="Fan of the Month" winner={latestFanOfMonthWinner} />
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
