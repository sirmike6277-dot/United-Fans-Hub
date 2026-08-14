import Link from "next/link";
import { Avatar, crownFor } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { LeaderboardEntry } from "@/lib/leaderboard/leaderboard";

export interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}

/** Gold / silver / bronze treatment for the top 3 — everyone else gets the plain numbered rank. */
const PODIUM: Record<number, { ring: string; chip: string }> = {
  1: { ring: "ring-2 ring-[#f2c14e]", chip: "bg-[#f2c14e] text-[#241a00]" },
  2: { ring: "ring-2 ring-[#d7dbe1]", chip: "bg-[#d7dbe1] text-[#1c1c1c]" },
  3: { ring: "ring-2 ring-[#d99a63]", chip: "bg-[#d99a63] text-[#241a00]" },
};

/**
 * Shows only what's already publicly readable on `profiles` — the exact
 * same field set MemberCard already renders (username/display_name/
 * avatar_url/fan_level), plus fan_points. Never shows anything about the
 * entry's predictions — that data isn't fetched here (or anywhere
 * cross-user; see leaderboard.ts) at all.
 */
export function LeaderboardRow({ entry, rank, isCurrentUser }: LeaderboardRowProps) {
  const name = entry.display_name || entry.username;
  // fetchFanLeaderboard's ordering (fan_points desc, id asc) gives every row
  // a real, distinct position even when every fan is tied at 0 points —
  // right now that's every fan, since fan_points is currently only earned
  // via settled match predictions (see leaderboard.ts). A 0-point "#1" with
  // a gold ring is a fabricated signal, not an earned one: nobody's actually
  // ahead of anyone yet, the tie-break just picked someone. So a 0-point
  // entry always renders "Unranked" here, regardless of its numeric position.
  const hasEarnedRank = entry.fan_points > 0;
  const podium = hasEarnedRank ? PODIUM[rank] : undefined;

  return (
    <Link href={`/profile/${entry.id}`} className="block">
      <Card
        className={`!p-4 flex items-center gap-3 transition-colors hover:border-ink/30 sm:!p-5 ${
          isCurrentUser ? "border-red-primary/50 bg-red-primary/5" : ""
        }`}
      >
        {podium ? (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${podium.chip}`}
            aria-hidden="true"
          >
            {rank}
          </span>
        ) : hasEarnedRank ? (
          <span className="w-7 shrink-0 text-center font-display text-sm font-bold text-text-muted">#{rank}</span>
        ) : (
          <span className="w-7 shrink-0 text-center font-display text-[10px] font-bold uppercase text-text-muted/60">—</span>
        )}
        <Avatar
          url={entry.avatar_url}
          name={name}
          size={40}
          className={podium ? `${podium.ring} ring-offset-2 ring-offset-bg-surface` : undefined}
          crown={crownFor(entry)}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 font-display font-semibold text-ink">
            {/* truncate lives on the name alone, not the whole line — "(You)"
                is a sibling with shrink-0 so it can never itself get clipped
                by a long display name/username. */}
            <span className="truncate">{name}</span>
            {isCurrentUser ? <span className="shrink-0 text-xs font-normal text-red-primary">(You)</span> : null}
          </p>
          <p className="truncate text-sm text-text-muted">@{entry.username}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="whitespace-nowrap text-sm font-semibold text-ink">
            {entry.fan_points.toLocaleString()} pts
          </span>
          <Badge tone="outline" className="!px-1.5 !py-0 text-[10px]">
            Level {entry.fan_level}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}
