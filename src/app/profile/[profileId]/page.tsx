import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { StartMessageButton } from "@/components/profile/StartMessageButton";
import { FollowButton } from "@/components/community/FollowButton";
import { fetchMyRank, fetchLeaderboardSize } from "@/lib/leaderboard/leaderboard";
import { fetchFollowCounts, fetchFollowState } from "@/lib/community/follows";
import { fetchPostsCount } from "@/lib/profile/stats";
import { fetchPostsByAuthor, POSTS_PAGE_SIZE } from "@/lib/community/posts";
import { fetchBadgeCatalog, fetchFanStats } from "@/lib/achievements/achievements";

export const metadata: Metadata = {
  title: "Member Profile — United Fans Hub",
};

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  // Canonical self-view stays at /profile (it renders "Edit Profile", not
  // "Message") — never render a second, slightly-different self page here.
  if (profileId === userId) redirect("/profile");

  // RLS makes every profile publicly readable, so a null result here means
  // the id genuinely doesn't exist — not a permissions gap.
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", profileId).single();

  if (!profile) redirect("/members");

  const [
    { rank, error: rankError },
    { total },
    { followers, following, error: followCountError },
    { isFollowing, error: followStateError },
    postsCount,
    { posts, error: postsError },
    { badges, error: badgesError },
    { data: viewerProfile },
  ] = await Promise.all([
    fetchMyRank(supabase, { profileId: profile.id, fanPoints: profile.fan_points }),
    fetchLeaderboardSize(supabase),
    fetchFollowCounts(supabase, profile.id),
    fetchFollowState(supabase, { currentUserId: userId, targetProfileId: profile.id }),
    fetchPostsCount(supabase, profile.id),
    fetchPostsByAuthor(supabase, { authorId: profile.id, from: 0, to: POSTS_PAGE_SIZE - 1, currentUserId: userId }),
    fetchBadgeCatalog(supabase),
    supabase.from("profiles").select("id, username, display_name, avatar_url, fan_level").eq("id", userId).single(),
  ]);

  // predictions are RLS'd to their own owner — this viewer can never see
  // profile.id's real correct-prediction count, so evaluateBadge is told
  // explicitly "unknown" (null) rather than defaulting to 0 (which would
  // misrepresent a real achievement as unearned).
  const fanStats = await fetchFanStats(supabase, { profileId: profile.id, predictionsCorrect: null });

  return (
    <AppShell>
      <ProfileView
        profile={profile}
        rank={rankError ? null : rank}
        totalParticipants={total}
        followerCount={followCountError ? null : followers}
        followingCount={followCountError ? null : following}
        postsCount={postsCount}
        viewer={
          viewerProfile
            ? {
                id: viewerProfile.id,
                username: viewerProfile.username,
                displayName: viewerProfile.display_name || viewerProfile.username,
                avatarUrl: viewerProfile.avatar_url,
                fanLevel: viewerProfile.fan_level,
              }
            : { id: userId, username: "you", displayName: "You", avatarUrl: null, fanLevel: 1 }
        }
        posts={posts}
        postsError={postsError}
        badges={badgesError ? [] : badges}
        fanStats={fanStats}
        action={
          <div className="flex items-center gap-2">
            {followStateError ? null : (
              <FollowButton
                currentUserId={userId}
                targetProfileId={profile.id}
                initialIsFollowing={isFollowing}
              />
            )}
            <StartMessageButton currentUserId={userId} targetProfileId={profile.id} />
          </div>
        }
      />
    </AppShell>
  );
}
