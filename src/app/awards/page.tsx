import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { SectionBanner } from "@/components/layout/SectionBanner";
import { AwardsHub } from "@/components/awards/AwardsHub";
import { fetchAwardCategories, fetchAwardPeriods, fetchWinners } from "@/lib/awards/awards";

export const metadata: Metadata = {
  title: "Awards — United Fans Hub",
};

export default async function AwardsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const [{ categories, error: categoriesError }, { periods, error: periodsError }, { winners, error: winnersError }, { data: isAwardManager }, { data: isSuperAdmin }] =
    await Promise.all([
      fetchAwardCategories(supabase),
      fetchAwardPeriods(supabase),
      fetchWinners(supabase),
      supabase.rpc("has_role", { role_key: "award_manager" }),
      supabase.rpc("has_role", { role_key: "super_admin" }),
    ]);

  const error = categoriesError || periodsError || winnersError;

  return (
    <AppShell>
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 pt-6 sm:pt-8">
          <SectionBanner
            imageSrc="/images/stadium/old-trafford-interior.jpg"
            imageAlt="A packed Old Trafford stand, seen from inside the ground"
            kicker="Awards"
            title="Fan of the Month. Fan of the Season."
            subtitle="Nominate and vote for the fans who make this community what it is."
          />
        </div>

        {error ? (
          <p className="text-center text-sm text-text-muted">{error}</p>
        ) : (
          <AwardsHub
            categories={categories}
            initialPeriods={periods}
            initialWinners={winners}
            currentUserId={userId}
            canManage={Boolean(isAwardManager || isSuperAdmin)}
          />
        )}
      </main>
    </AppShell>
  );
}
