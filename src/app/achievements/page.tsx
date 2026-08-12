import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { fetchPredictionHistory, derivePredictionStats } from "@/lib/predictions/predictions";
import { fetchBadgeCatalog, fetchFanStats, evaluateBadge } from "@/lib/achievements/achievements";

export const metadata: Metadata = {
  title: "Achievements — United Fans Hub",
};

/**
 * New page (previously entirely unbuilt — see migration 023's own comment).
 * The badge catalog is real, seeded, shared data; each badge's earned/
 * in-progress/not-tracked state is evaluated live against this fan's own
 * real counts (see evaluateBadge) — nothing here is written to
 * `user_badges` (that stays super_admin-only per migration 007's RLS) or
 * fabricated for display.
 */
export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const profileId = claimsData?.claims.sub;

  if (!profileId) redirect("/login");

  const [{ badges, error: badgesError }, { predictions }] = await Promise.all([
    fetchBadgeCatalog(supabase),
    fetchPredictionHistory(supabase, { profileId }),
  ]);

  const { correctPredictions } = derivePredictionStats(predictions);
  const stats = await fetchFanStats(supabase, { profileId, predictionsCorrect: correctPredictions });

  const earnedCount = badges.filter((b) => evaluateBadge(b.criteria, stats).state === "earned").length;

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="flex flex-col gap-6 py-6 sm:py-8">
          <PageHeader
            title="Achievements"
            subtitle="Unlock badges. Show your United pride."
            action={
              <span className="text-sm text-text-muted">
                <span className="font-display font-bold text-white">{earnedCount}</span> / {badges.length} earned
              </span>
            }
          />

          {badgesError ? (
            <div className="rounded-card border border-white/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
              {badgesError}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {badges.map((badge) => (
                <AchievementCard
                  key={badge.id}
                  badgeKey={badge.key}
                  name={badge.name}
                  description={badge.description}
                  status={evaluateBadge(badge.criteria, stats)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
