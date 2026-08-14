import Link from "next/link";
import { Avatar, crownFor } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CrownIcon } from "@/components/achievements/AchievementIcons";
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
 */
export function WinnerAnnouncement({ winner }: WinnerAnnouncementProps) {
  const name = winner.nomination.nominee.display_name || winner.nomination.nominee.username;

  return (
    <Card
      featured
      className="relative flex flex-col items-center gap-3 overflow-hidden py-8 text-center"
      style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(242,193,78,0.18), transparent 60%)" }}
    >
      <span className="text-[#f2c14e]" aria-hidden="true">
        <CrownIcon size={28} />
      </span>
      <Badge tone="red">{winner.categoryName}</Badge>
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
