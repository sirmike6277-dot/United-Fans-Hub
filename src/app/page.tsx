import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { MatchdayPreview } from "@/components/landing/MatchdayPreview";
import { RankingsPreview } from "@/components/landing/RankingsPreview";
import { FanOfMonthPreview } from "@/components/landing/FanOfMonthPreview";
import { CommunityPreview } from "@/components/landing/CommunityPreview";
import { FinalCta } from "@/components/landing/FinalCta";
import { fetchFanLeaderboard } from "@/lib/leaderboard/leaderboard";
import { fetchFeedPage } from "@/lib/community/posts";

/**
 * The marketing landing page — signed-out visitors only. A signed-in fan
 * has a real home (/dashboard) and should never land back on the "Join the
 * community" pitch after already joining it, so this redirects before
 * rendering anything below. Every other page in the app already treats
 * /dashboard as the authenticated "front door" (see its own comment); this
 * is the other half of that decision — the one place that was still
 * showing the signed-out pitch to a signed-in visitor.
 */
export default async function Home() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (claimsData?.claims.sub) {
    redirect("/dashboard");
  }

  // Real data for a signed-out visitor, same tables/functions the real
  // authenticated pages use (profiles/posts are both publicly readable) —
  // see RankingsPreview/CommunityPreview for why this replaced fabricated
  // placeholder content.
  const [{ entries: leaderboardEntries }, { posts: recentPosts }] = await Promise.all([
    fetchFanLeaderboard(supabase, { from: 0, to: 3 }),
    fetchFeedPage(supabase, { from: 0, to: 2, currentUserId: "" }),
  ]);

  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1">
        <Hero />
        <FeatureSection />
        <MatchdayPreview />
        <RankingsPreview entries={leaderboardEntries} />
        <FanOfMonthPreview />
        <CommunityPreview posts={recentPosts} />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
