"use client";

import { Avatar } from "@/components/ui/Avatar";
import { FanLevelBadge } from "@/components/ui/FanLevelBadge";
import type { AwardNomination } from "@/lib/awards/awards";

export interface NomineeVoteCardProps {
  nomination: AwardNomination;
  totalVotes: number;
  isMyVote: boolean;
  votingOpen: boolean;
  voting: boolean;
  onVote: (nominationId: string) => void;
}

/**
 * One nominee's row in the voting list — same progress-bar-behind-the-row
 * visual language as Fan Room polls' PollCard, adapted for a nominee
 * (avatar/name/reason) instead of a plain text option. `aria-pressed`
 * marks the ballot's current state; a real <button>, not an icon-only
 * control, and disabled (not hidden) once voting closes or a vote is
 * already locked in — award_votes has no "change your vote" path (see
 * awards.ts's own doc comment on castAwardVote), so once `isMyVote` is
 * true for any nominee, every row in the list becomes non-interactive.
 */
export function NomineeVoteCard({ nomination, totalVotes, isMyVote, votingOpen, voting, onVote }: NomineeVoteCardProps) {
  const name = nomination.nominee.display_name || nomination.nominee.username;
  const percent = totalVotes > 0 ? Math.round((nomination.voteCount / totalVotes) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onVote(nomination.id)}
      disabled={!votingOpen || voting}
      aria-pressed={isMyVote}
      aria-label={`Vote for ${name}${isMyVote ? " (your current vote)" : ""} — ${nomination.voteCount.toLocaleString()} ${nomination.voteCount === 1 ? "vote" : "votes"}`}
      className={`relative w-full overflow-hidden rounded-control border px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
        isMyVote ? "border-red-primary/50" : "border-ink/10"
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 ${isMyVote ? "bg-red-primary/20" : "bg-ink/10"}`}
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      />
      <span className="relative z-10 flex items-center gap-3">
        <Avatar url={nomination.nominee.avatar_url} name={name} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={`truncate text-sm font-medium ${isMyVote ? "text-ink" : "text-text-body"}`}>{name}</span>
            <FanLevelBadge level={nomination.nominee.fan_level} />
          </span>
          {nomination.reason ? <span className="block truncate text-xs text-text-muted">{nomination.reason}</span> : null}
        </span>
        <span className="shrink-0 text-xs text-text-muted">
          {percent}% ({nomination.voteCount.toLocaleString()})
        </span>
      </span>
    </button>
  );
}
