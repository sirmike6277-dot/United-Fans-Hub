import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow";
import { TrophyIcon } from "@/components/predictions/PredictionIcons";
import type { LeaderboardEntry } from "@/lib/leaderboard/leaderboard";

export interface TopFansWidgetProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

/** Reuses the real LeaderboardRow component (Phase 8B) — same data, same row, no second implementation. */
export function TopFansWidget({ entries, currentUserId }: TopFansWidgetProps) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <TrophyIcon />
        <h2 className="font-display text-lg font-bold uppercase text-white">Top Fans</h2>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">The leaderboard will populate as fans participate.</p>
        ) : (
          entries.map((entry, index) => (
            <LeaderboardRow key={entry.id} entry={entry} rank={index + 1} isCurrentUser={entry.id === currentUserId} />
          ))
        )}
      </div>

      <Link
        href="/predictions"
        className="mt-3 block text-center text-xs font-medium text-red-primary hover:text-red-hover"
      >
        View full rankings
      </Link>
    </Card>
  );
}
