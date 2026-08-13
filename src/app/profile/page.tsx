import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ProfileView } from "@/components/profile/ProfileView";
import { fetchMyRank, fetchLeaderboardSize } from "@/lib/leaderboard/leaderboard";
import { fetchFollowCounts } from "@/lib/community/follows";
import { fetchPostsCount, fetchPredictionsCount } from "@/lib/profile/stats";
import { fetchPostsByAuthor, POSTS_PAGE_SIZE } from "@/lib/community/posts";
import { fetchBadgeCatalog, fetchFanStats } from "@/lib/achievements/achievements";
import { fetchPredictionHistory, derivePredictionStats } from "@/lib/predictions/predictions";
import { fetchSocialLinks } from "@/lib/profile/socialLinks";
import { fetchFanLevels, computeLevelProgress } from "@/lib/achievements/fanLevels";

export const metadata: Metadata = {
  title: "Your Profile — United Fans Hub",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (!profile) redirect("/login");

  // Reuses the exact rank query already built/verified for the /predictions
  // leaderboard (Phase 8B) — no new query shape, no fabricated number.
  const [
    { rank, error: rankError },
    { total },
    { followers, following, error: followError },
    postsCount,
    predictionsCount,
    { posts, error: postsError },
    { badges, error: badgesError },
    { predictions: predictionHistory },
    socialLinks,
    fanLevels,
  ] = await Promise.all([
    fetchMyRank(supabase, { profileId: userId, fanPoints: profile.fan_points }),
    fetchLeaderboardSize(supabase),
    fetchFollowCounts(supabase, userId),
    fetchPostsCount(supabase, userId),
    fetchPredictionsCount(supabase, userId),
    fetchPostsByAuthor(supabase, { authorId: userId, from: 0, to: POSTS_PAGE_SIZE - 1, currentUserId: userId }),
    fetchBadgeCatalog(supabase),
    fetchPredictionHistory(supabase, { profileId: userId }),
    fetchSocialLinks(supabase, userId),
    fetchFanLevels(supabase),
  ]);

  const levelProgress = computeLevelProgress(profile.fan_points, fanLevels);

  const predictionStats = derivePredictionStats(predictionHistory);
  const fanStats = await fetchFanStats(supabase, {
    profileId: userId,
    predictionsCorrect: predictionStats.correctPredictions,
  });

  return (
    <AppShell>
      <ProfileView
        profile={profile}
        rank={rankError ? null : rank}
        totalParticipants={total}
        followerCount={followError ? null : followers}
        followingCount={followError ? null : following}
        postsCount={postsCount}
        predictionsCount={predictionsCount}
        viewer={{
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name || profile.username,
          avatarUrl: profile.avatar_url,
          fanLevel: profile.fan_level,
        }}
        posts={posts}
        postsError={postsError}
        badges={badgesError ? [] : badges}
        fanStats={fanStats}
        predictionHistory={predictionHistory}
        predictionStats={predictionStats}
        socialLinks={socialLinks}
        levelProgress={levelProgress}
        action={
          <Button href="/profile/edit" variant="secondary" size="sm">
            Edit Profile
          </Button>
        }
      />
    </AppShell>
  );
}
