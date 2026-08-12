import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { SectionBanner } from "@/components/layout/SectionBanner";
import { NotificationsFeed } from "@/components/notifications/NotificationsFeed";
import { Card } from "@/components/ui/Card";
import { PullQuote } from "@/components/ui/PullQuote";
import { TopFansWidget } from "@/components/dashboard/TopFansWidget";
import { fetchNotificationsPage, NOTIFICATIONS_PAGE_SIZE } from "@/lib/notifications/notifications";
import { fetchFanLeaderboard } from "@/lib/leaderboard/leaderboard";

export const metadata: Metadata = {
  title: "Notifications — United Fans Hub",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const [{ notifications, error }, { entries: topFans }] = await Promise.all([
    fetchNotificationsPage(supabase, { from: 0, to: NOTIFICATIONS_PAGE_SIZE - 1, currentUserId: userId }),
    fetchFanLeaderboard(supabase, { from: 0, to: 2 }),
  ]);

  return (
    <AppShell
      rail={
        <div className="flex flex-col gap-6">
          <TopFansWidget entries={topFans} currentUserId={userId} />
          <Card>
            <PullQuote
              quote="Manchester United is a marvellous club, a marvellous life."
              attribution="George Best"
            />
          </Card>
        </div>
      }
    >
      <main className="flex-1 bg-bg-void">
        <div className="mb-6 max-w-2xl pt-6 sm:pt-8">
          <SectionBanner
            imageSrc="/images/stadium/old-trafford-trinity-statue.jpg"
            imageAlt="The United Trinity statue of George Best, Denis Law, and Sir Bobby Charlton outside Old Trafford"
            kicker="Notifications"
            title="Never miss a moment."
            quote={{
              quote:
                "Once you've played for Manchester United, you can never play for anybody else. You'd retire first.",
              attribution: "Denis Law",
            }}
          />
        </div>
        <NotificationsFeed
          hideHeader
          currentUserId={userId}
          initialNotifications={notifications}
          initialError={error}
          initialHasMore={notifications.length === NOTIFICATIONS_PAGE_SIZE}
        />
      </main>
    </AppShell>
  );
}
