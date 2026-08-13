import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CrownIcon } from "@/components/achievements/AchievementIcons";
import type { AwardWinner } from "@/lib/awards/awards";

export interface FanOfMonthTeaserProps {
  /** The most recent real, announced "Fan of the Month" winner — null means none has been announced yet (Awards, Phase 18, may still be mid-nomination/voting). */
  winner: AwardWinner | null;
}

/**
 * Was a permanent "Coming soon" placeholder (the awards/voting schema
 * existed but had zero rows and zero UI anywhere — Phase 9 audit). Awards
 * is now a real, built feature (Phase 18) — this shows the real latest
 * winner once one exists, and an honest "voting is live, check it out"
 * link to /awards otherwise. Never a fabricated winner/name/quote/points
 * total standing in for a real one.
 */
export function FanOfMonthTeaser({ winner }: FanOfMonthTeaserProps) {
  const name = winner ? winner.nomination.nominee.display_name || winner.nomination.nominee.username : null;

  return (
    <Link href="/awards" className="block">
      <Card
        featured
        className="relative overflow-hidden text-center transition-colors hover:border-white/30"
        style={{
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(242,193,78,0.16), transparent 60%)",
        }}
      >
        <div className="flex items-center justify-between gap-2 text-left">
          <h2 className="font-display text-lg font-bold uppercase text-white">Fan of the Month</h2>
          <Badge tone={winner ? "red" : "outline"}>{winner ? "Winner" : "Vote now"}</Badge>
        </div>

        {winner ? (
          <>
            <Avatar url={winner.nomination.nominee.avatar_url} name={name ?? "Winner"} size={72} className="mx-auto mt-5" />
            <p className="mt-3 font-display text-base font-bold text-white">{name}</p>
            <p className="text-xs text-text-muted">{winner.voteCount.toLocaleString()} votes</p>
          </>
        ) : (
          <div className="relative mx-auto mt-5 flex h-20 w-20 items-center justify-center">
            <span className="absolute -top-3 text-[#f2c14e]" aria-hidden="true">
              <CrownIcon size={22} />
            </span>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#f2c14e]/50 text-xs text-text-muted">
              ?
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-text-muted">
          {winner
            ? "Recognised by the community — nominated and voted for by fans themselves."
            : "Nominate and vote for the fan who embodies the community most this month."}
        </p>
      </Card>
    </Link>
  );
}
