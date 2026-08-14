"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { TrophyIcon } from "@/components/predictions/PredictionIcons";
import { LeaderboardRow } from "./LeaderboardRow";
import { LeaderboardRowSkeleton } from "./LeaderboardRowSkeleton";
import { fetchFanLeaderboard, LEADERBOARD_PAGE_SIZE } from "@/lib/leaderboard/leaderboard";
import type { LeaderboardEntry } from "@/lib/leaderboard/leaderboard";

export interface LeaderboardSectionProps {
  currentUserId: string;
  initialEntries: LeaderboardEntry[];
  initialError: string | null;
  initialHasMore: boolean;
  /** Total registered profiles — see leaderboard.ts on why this isn't "predictors only". */
  totalParticipants: number;
}

/**
 * "Load more" pagination mirrors MembersDirectory exactly (same page size
 * convention, same error/retry shape) — no search here, since ranking by
 * points doesn't need it. Rank numbers are `entries.length`-derived
 * (1-indexed position in the already-ordered list), which stays correct
 * across "Load more" pages because fetchFanLeaderboard's ordering
 * (fan_points desc, id asc) never changes between page 1 and later pages.
 */
export function LeaderboardSection({
  currentUserId,
  initialEntries,
  initialError,
  initialHasMore,
  totalParticipants,
}: LeaderboardSectionProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState(initialError);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  async function retry() {
    setError(null);
    const supabase = createClient();
    const { entries: first, error: fetchError } = await fetchFanLeaderboard(supabase, {
      from: 0,
      to: LEADERBOARD_PAGE_SIZE - 1,
    });

    if (fetchError) {
      setError(fetchError);
      return;
    }
    setEntries(first);
    setHasMore(first.length === LEADERBOARD_PAGE_SIZE);
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setError(null);

    const supabase = createClient();
    const from = entries.length;
    const { entries: next, error: fetchError } = await fetchFanLeaderboard(supabase, {
      from,
      to: from + LEADERBOARD_PAGE_SIZE - 1,
    });

    setLoadingMore(false);

    if (fetchError) {
      setError(fetchError);
      return;
    }

    setEntries((prev) => [...prev, ...next]);
    setHasMore(next.length === LEADERBOARD_PAGE_SIZE);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TrophyIcon />
        <h2 className="font-display text-lg font-bold uppercase text-red-primary">Leaderboard</h2>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-ink/10 bg-bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">{error}</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-ink/10 bg-bg-surface p-10 text-center">
          <TrophyIcon size={28} />
          <p className="font-display text-lg font-semibold text-ink">Leaderboard is empty</p>
          <p className="text-sm text-text-muted">The leaderboard will populate as fans join and earn points.</p>
        </div>
      ) : (
        <>
          {totalParticipants === 1 ? (
            <p className="text-sm text-text-muted">
              You&apos;re currently the only participating fan — invite others to compete!
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            {entries.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                rank={index + 1}
                isCurrentUser={entry.id === currentUserId}
              />
            ))}
          </div>

          {loadingMore ? (
            <div className="flex flex-col gap-3">
              <LeaderboardRowSkeleton />
              <LeaderboardRowSkeleton />
            </div>
          ) : hasMore ? (
            <div className="flex justify-center py-2">
              <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-text-muted">You&apos;ve reached the end of the list.</p>
          )}
        </>
      )}
    </section>
  );
}
