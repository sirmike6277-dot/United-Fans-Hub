import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar, crownFor, CrownIcon, SeasonAura } from "@/components/ui/Avatar";
import type { AwardWinner } from "@/lib/awards/awards";

export interface FanOfMonthTeaserProps {
  /** Which category this card represents — drives its fallback label and, for season, the richer royal purple/gold treatment. */
  categoryLabel: "Fan of the Month" | "Fan of the Season";
  /** The most recent real, announced winner for this specific category — null means none has been announced yet (Awards, Phase 18, may still be mid-nomination/voting). */
  winner: AwardWinner | null;
}

/**
 * Was a permanent "Coming soon" placeholder (the awards/voting schema
 * existed but had zero rows and zero UI anywhere — Phase 9 audit). Awards
 * is now a real, built feature (Phase 18) — this shows the real latest
 * winner once one exists, and an honest "voting is live, check it out"
 * link to /awards otherwise. Never a fabricated winner/name/quote/points
 * total standing in for a real one.
 *
 * One card per category, rendered side by side on the dashboard — was
 * previously a single card that silently preferred whichever category had
 * a winner (and fell back to labelling itself "Fan of the Month" even when
 * only a Fan of the Season period existed), meaning Fan of the Season
 * could go completely unwritten here despite real nominations existing for
 * it. Season gets its own richer royal purple/gold treatment, same as
 * WinnerAnnouncement and the landing page use.
 */
export function FanOfMonthTeaser({ categoryLabel, winner }: FanOfMonthTeaserProps) {
  const isSeason = categoryLabel === "Fan of the Season";
  const name = winner ? winner.nomination.nominee.display_name || winner.nomination.nominee.username : null;

  return (
    <Link href="/awards" className="block">
      <Card
        featured
        className="relative overflow-hidden text-center transition-colors hover:border-ink/30"
        style={{
          backgroundImage: isSeason
            ? "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.2), rgba(242,193,78,0.12) 45%, transparent 70%)"
            : "radial-gradient(circle at 50% 0%, rgba(242,193,78,0.16), transparent 60%)",
        }}
      >
        <div className="flex items-center justify-between gap-2 text-left">
          <h2 className="font-display text-lg font-bold uppercase text-red-primary">{winner?.categoryName ?? categoryLabel}</h2>
          <Badge
            tone={winner ? "red" : "outline"}
            className={winner && isSeason ? "season-shimmer-bg" : undefined}
            style={
              winner && isSeason
                ? { backgroundImage: "linear-gradient(120deg, #fde08a, #c9a5f2 35%, #7c3aed 60%, #c9a5f2 85%, #fde08a)", color: "#2e1065" }
                : undefined
            }
          >
            {winner ? "Winner" : "Vote now"}
          </Badge>
        </div>

        {winner ? (
          <>
            <Avatar
              url={winner.nomination.nominee.avatar_url}
              name={name ?? "Winner"}
              size={72}
              className="mx-auto mt-5"
              crown={crownFor(winner.nomination.nominee)}
            />
            <p className="mt-3 font-display text-base font-bold text-ink">{name}</p>
            <p className="text-xs text-text-muted">{winner.voteCount.toLocaleString()} votes</p>
          </>
        ) : (
          <div className="relative mx-auto mt-5 flex h-20 w-20 items-center justify-center">
            {/* A literal preview of the prize, even before anyone's won it
                — the spinning aura teases what the badge actually looks
                like, rather than just a plain "?" like Month gets. */}
            {isSeason ? <SeasonAura inset={-4} /> : null}
            <span className="absolute -top-3" style={{ color: isSeason ? undefined : "#f2c14e" }} aria-hidden="true">
              <CrownIcon size={22} season={isSeason} />
            </span>
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed bg-bg-elevated text-xs text-text-muted"
              style={{ borderColor: isSeason ? "rgba(201,165,242,0.5)" : "rgba(242,193,78,0.5)" }}
            >
              ?
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-text-muted">
          {winner
            ? "Recognised by the community — nominated and voted for by fans themselves."
            : `Nominate and vote for the fan who embodies the community most this ${isSeason ? "season" : "month"}.`}
        </p>
      </Card>
    </Link>
  );
}
