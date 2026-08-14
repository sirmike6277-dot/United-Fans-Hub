import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CrownIcon } from "@/components/achievements/AchievementIcons";
import { WinnerAnnouncement } from "@/components/awards/WinnerAnnouncement";
import { createClient } from "@/lib/supabase/server";
import { fetchWinners } from "@/lib/awards/awards";

/**
 * Was a permanent, hardcoded "Coming soon" placeholder — real when written
 * (the awards schema had zero rows and no voting UI at the time), now
 * stale: nominate → vote → determine_award_winner is a real, live feature
 * and real winners exist (see dashboard's own FanOfMonthTeaser, fixed the
 * same way). Reuses the exact same fetchWinners() + categoryKey lookup
 * dashboard/page.tsx already does — that function orders newest-first
 * across every category, so the first match per key is the latest one —
 * and the same WinnerAnnouncement card /awards itself uses, rather than
 * inventing a second "current winner" presentation. Season is shown in
 * preference to month when both exist (the bigger of the two crowns);
 * falls back to the honest "Coming soon" card only when nobody has
 * actually been crowned in either category yet.
 */
export async function FanOfMonthPreview() {
  const supabase = await createClient();
  const { winners } = await fetchWinners(supabase);

  const latestSeasonWinner = winners.find((w) => w.categoryKey === "fan_of_season") ?? null;
  const latestMonthWinner = winners.find((w) => w.categoryKey === "fan_of_month") ?? null;
  const winner = latestSeasonWinner ?? latestMonthWinner;

  return (
    <section className="bg-bg-void py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Badge tone="red">{winner?.categoryName ?? "Fan of the Month"}</Badge>
        <h2 className="mt-4 font-display text-3xl font-bold uppercase text-ink sm:text-4xl">
          Celebrating the community
        </h2>
        <p className="mt-4 text-text-muted">
          {winner
            ? "Nominated and voted for by fans themselves — this is who the community has crowned."
            : "Every month (and every season), the Hub recognises the fan who embodies the family most — nominated and voted for by fans themselves. No one's been crowned yet, but voting is live."}
        </p>

        {winner ? (
          <div className="mx-auto mt-10 max-w-sm">
            <WinnerAnnouncement winner={winner} />
          </div>
        ) : (
          <Card
            featured
            className="relative mx-auto mt-10 flex max-w-sm flex-col items-center gap-2 overflow-hidden py-10"
            style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(242,193,78,0.18), transparent 60%)" }}
          >
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute -top-4 text-[#f2c14e]" aria-hidden="true">
                <CrownIcon size={24} />
              </span>
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#f2c14e]/50 text-xs text-text-muted">
                ?
              </div>
            </div>
            <Badge tone="outline">Coming soon</Badge>
          </Card>
        )}
      </div>
    </section>
  );
}
