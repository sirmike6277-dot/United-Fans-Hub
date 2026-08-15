import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CrownIcon, SeasonAura } from "@/components/ui/Avatar";
import { WinnerAnnouncement } from "@/components/awards/WinnerAnnouncement";
import { createClient } from "@/lib/supabase/server";
import { fetchAwardPeriods, fetchWinners } from "@/lib/awards/awards";

/**
 * `hasPeriod` distinguishes "a period exists and is underway" (Voting
 * live — even if that just means nominations, not votes yet; this app
 * doesn't currently split those two states in copy anywhere else either)
 * from "no period has ever been started for this category" (Coming soon)
 * — without this, a category with zero periods would falsely claim voting
 * is live for it too. Season previews the spinning aura even here, before
 * anyone's actually won it — the whole point is making it look worth
 * chasing.
 */
function EmptyCrownCard({ label, accent, season, hasPeriod }: { label: string; accent: string; season: boolean; hasPeriod: boolean }) {
  return (
    <Card
      featured
      className="relative flex flex-1 flex-col items-center gap-2 overflow-hidden py-10"
      style={{ backgroundImage: `radial-gradient(circle at 50% 0%, ${accent}2e, transparent 60%)` }}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        {season ? <SeasonAura inset={-4} /> : null}
        <span className="absolute -top-4" style={{ color: season ? undefined : accent }} aria-hidden="true">
          <CrownIcon size={24} season={season} />
        </span>
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed bg-bg-surface text-xs text-text-muted"
          style={{ borderColor: `${accent}80` }}
        >
          ?
        </div>
      </div>
      <Badge tone="red">{label}</Badge>
      <Badge tone="outline">{hasPeriod ? "Voting live" : "Coming soon"}</Badge>
    </Card>
  );
}

/**
 * Was a permanent, hardcoded "Coming soon" placeholder — real when written
 * (the awards schema had zero rows and no voting UI at the time), now
 * stale: nominate → vote → determine_award_winner is a real, live feature
 * and real winners exist (see dashboard's own FanOfMonthTeaser, fixed the
 * same way). Reuses the exact same fetchWinners() + categoryKey lookup
 * dashboard/page.tsx already does — that function orders newest-first
 * across every category, so the first match per key is the latest one —
 * and the same WinnerAnnouncement card /awards itself uses, rather than
 * inventing a second "current winner" presentation.
 *
 * Both categories are always shown, side by side, each with its own honest
 * state — was previously a single card that silently preferred whichever
 * category had a winner (or fell back to labelling itself "Fan of the
 * Month" even when only a Fan of the Season period was actually active),
 * which meant "Fan of the Season" could go completely unwritten on the
 * landing page despite real nominations existing for it.
 */
export async function FanOfMonthPreview() {
  const supabase = await createClient();
  const [{ winners }, { periods }] = await Promise.all([fetchWinners(supabase), fetchAwardPeriods(supabase)]);

  const seasonWinner = winners.find((w) => w.categoryKey === "fan_of_season") ?? null;
  const monthWinner = winners.find((w) => w.categoryKey === "fan_of_month") ?? null;
  const anyWinner = seasonWinner ?? monthWinner;
  const hasSeasonPeriod = periods.some((p) => p.category.key === "fan_of_season");
  const hasMonthPeriod = periods.some((p) => p.category.key === "fan_of_month");

  return (
    <section id="awards" className="bg-bg-void py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Badge tone="red">Fan of the Month &amp; Fan of the Season</Badge>
        <h2 className="mt-4 font-display text-3xl font-bold uppercase text-ink sm:text-4xl">
          Celebrating the community
        </h2>
        <p className="mt-4 text-text-muted">
          {anyWinner
            ? "Nominated and voted for by fans themselves — these are the fans the community has crowned."
            : "Every month, and every season, the Hub recognises the fan who embodies the family most — nominated and voted for by fans themselves. No one's been crowned yet, but voting is live."}
        </p>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-stretch">
          {seasonWinner ? (
            <WinnerAnnouncement winner={seasonWinner} />
          ) : (
            <EmptyCrownCard label="Fan of the Season" accent="#c9a5f2" season hasPeriod={hasSeasonPeriod} />
          )}
          {monthWinner ? (
            <WinnerAnnouncement winner={monthWinner} />
          ) : (
            <EmptyCrownCard label="Fan of the Month" accent="#f2c14e" season={false} hasPeriod={hasMonthPeriod} />
          )}
        </div>
      </div>
    </section>
  );
}
