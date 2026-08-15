import Link from "next/link";
import { Avatar, crownFor, CrownIcon } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/format";
import type { AwardWinner } from "@/lib/awards/awards";

export interface WinnerAnnouncementProps {
  winner: AwardWinner;
}

/**
 * The winner reveal — reuses the same crown motif the landing page's
 * FanOfMonthPreview "Coming soon" placeholder already established, now
 * filled in with a real winner instead of a dashed "?" circle. Vote count
 * shown is the real, final `award_winners.vote_count` snapshot (migration
 * 009's own denormalization — see determine_award_winner()), not
 * recomputed from award_votes live, so it can never drift even if vote
 * rows are ever touched afterward.
 *
 * Fan of the Season gets a visibly richer, royal purple/gold treatment
 * instead of Month's flat gold — the season crown is meant to read as the
 * bigger honour of the two wherever a winner is announced, not just on the
 * small Avatar ring.
 */
export function WinnerAnnouncement({ winner }: WinnerAnnouncementProps) {
  const name = winner.nomination.nominee.display_name || winner.nomination.nominee.username;
  const isSeason = winner.categoryKey === "fan_of_season";

  return (
    <Card
      featured
      className="relative flex flex-col items-center gap-3 overflow-hidden py-8 text-center"
      style={{
        backgroundImage: isSeason
          ? "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.22), rgba(242,193,78,0.14) 45%, transparent 70%)"
          : "radial-gradient(circle at 50% 0%, rgba(242,193,78,0.18), transparent 60%)",
      }}
    >
      {isSeason ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9a5f2]">Season Royalty</p> : null}
      <CrownIcon size={isSeason ? 40 : 28} season={isSeason} />
      <Badge
        tone="red"
        className={isSeason ? "season-shimmer-bg" : undefined}
        style={
          isSeason
            ? { backgroundImage: "linear-gradient(120deg, #fde08a, #c9a5f2 35%, #7c3aed 60%, #c9a5f2 85%, #fde08a)", color: "#2e1065" }
            : undefined
        }
      >
        {winner.categoryName}
      </Badge>
      <Link href={`/profile/${winner.nomination.nominee.id}`}>
        <Avatar url={winner.nomination.nominee.avatar_url} name={name} size={72} crown={crownFor(winner.nomination.nominee)} />
      </Link>
      <Link href={`/profile/${winner.nomination.nominee.id}`} className="hover:underline">
        <p className="font-display text-xl font-bold text-ink">{name}</p>
        <p className="text-sm text-text-muted">@{winner.nomination.nominee.username}</p>
      </Link>
      <p className="text-sm text-text-body">
        {winner.voteCount.toLocaleString()} {winner.voteCount === 1 ? "vote" : "votes"}
      </p>
      <time dateTime={winner.announcedAt} suppressHydrationWarning className="text-xs text-text-muted">
        Announced {formatRelativeTime(winner.announcedAt)}
      </time>
    </Card>
  );
}
