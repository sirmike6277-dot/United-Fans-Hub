import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar, crownFor } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { fetchWinners, type AwardWinner } from "@/lib/awards/awards";

function CrownRow({ label, winner }: { label: string; winner: AwardWinner | null }) {
  const name = winner ? winner.nomination.nominee.display_name || winner.nomination.nominee.username : null;
  return (
    <Link
      href={winner ? `/profile/${winner.nomination.nominee.id}` : "/awards"}
      className="flex items-center gap-3 rounded-control bg-bg-elevated px-3 py-2.5 transition-colors hover:bg-bg-elevated/70"
    >
      {winner ? (
        <Avatar url={winner.nomination.nominee.avatar_url} name={name ?? "Winner"} size={36} crown={crownFor(winner.nomination.nominee)} />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#f2c14e]/40 text-[10px] text-text-muted" aria-hidden="true">
          ?
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        {winner ? (
          <p className="truncate text-sm font-medium text-ink">{name}</p>
        ) : (
          <p className="truncate text-xs text-text-muted">Not crowned yet — vote now</p>
        )}
      </div>
    </Link>
  );
}

/**
 * Compact "who's currently crowned" widget for pages that don't already
 * show it — Community's rail and Predictions' rail previously had nothing
 * pointing at Awards at all, so a real, active Fan of the Season period
 * (or Fan of the Month) was invisible anywhere outside /awards itself and
 * the landing page. Season is listed first — the bigger of the two titles
 * — regardless of which currently has a real winner, so the category
 * itself stays visible even mid-voting with no winner yet (an honest "vote
 * now" prompt, never a fabricated name).
 */
export async function CrownedFansWidget() {
  const supabase = await createClient();
  const { winners } = await fetchWinners(supabase);
  const seasonWinner = winners.find((w) => w.categoryKey === "fan_of_season") ?? null;
  const monthWinner = winners.find((w) => w.categoryKey === "fan_of_month") ?? null;

  return (
    <Card>
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-text-muted">Crowned Fans</h2>
      <div className="mt-3 flex flex-col gap-2">
        <CrownRow label="Fan of the Season" winner={seasonWinner} />
        <CrownRow label="Fan of the Month" winner={monthWinner} />
      </div>
      <Link href="/awards" className="mt-3 block text-center text-xs font-medium text-red-primary hover:text-red-hover">
        View awards
      </Link>
    </Card>
  );
}
