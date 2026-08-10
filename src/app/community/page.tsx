import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";
import { Feed } from "@/components/community/Feed";
import { fetchFeedPage, POSTS_PAGE_SIZE } from "@/lib/community/posts";

export const metadata: Metadata = {
  title: "Community — United Fans Hub",
};

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", "manchester-united")
    .single();

  // Genuine blocker, not a schema issue: the seam exists (see 002_clubs_seam)
  // but the seed row is missing/renamed in this environment. Fail loudly
  // via the route's error boundary rather than posting with a null club_id.
  if (!club) {
    throw new Error(
      "Couldn't resolve the club record required to create posts. Expected a clubs row with slug 'manchester-united'.",
    );
  }

  const { posts, error } = await fetchFeedPage(supabase, {
    from: 0,
    to: POSTS_PAGE_SIZE - 1,
    currentUserId: userId,
  });

  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <Feed
          currentUser={{
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            avatarUrl: profile.avatar_url,
            fanLevel: profile.fan_level,
          }}
          clubId={club.id}
          initialPosts={posts}
          initialError={error}
          initialHasMore={posts.length === POSTS_PAGE_SIZE}
        />
      </main>
      <Footer />
    </>
  );
}
