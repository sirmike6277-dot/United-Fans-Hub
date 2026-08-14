"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { CrownIcon } from "@/components/achievements/AchievementIcons";
import { NominationForm } from "./NominationForm";
import { NomineeVoteCard } from "./NomineeVoteCard";
import { WinnerAnnouncement } from "./WinnerAnnouncement";
import { AwardPeriodAdminPanel } from "./AwardPeriodAdminPanel";
import { Button } from "@/components/ui/Button";
import {
  fetchAwardPeriods,
  fetchNominations,
  fetchWinners,
  castAwardVote,
  advancePeriods,
  type AwardCategory,
  type AwardPeriod,
  type AwardNomination,
  type AwardWinner,
} from "@/lib/awards/awards";

export interface AwardsHubProps {
  categories: AwardCategory[];
  initialPeriods: AwardPeriod[];
  initialWinners: AwardWinner[];
  currentUserId: string;
  canManage: boolean;
}

const VOTE_TOTALS_REFRESH_MS = 15000;

const STATUS_COPY: Record<AwardPeriod["status"], string> = {
  upcoming: "Upcoming",
  nominations_open: "Nominations open",
  voting_open: "Voting open",
  closed: "Voting closed — awaiting result",
  announced: "Winner announced",
};

/**
 * One category's current period + its nominations/voting/winner state.
 * Kept as its own component (rather than one giant AwardsHub body) so each
 * category's Realtime/polling effects are independently scoped and torn
 * down when the tab's category changes — mirrors RoomPollsPanel's own
 * per-scope subscription lifecycle.
 */
function CategoryPanel({
  category,
  period,
  winner,
  currentUserId,
  canManage,
  onPeriodChanged,
}: {
  category: AwardCategory;
  period: AwardPeriod | null;
  winner: AwardWinner | null;
  currentUserId: string;
  canManage: boolean;
  onPeriodChanged: () => void;
}) {
  const [nominations, setNominations] = useState<AwardNomination[]>([]);
  const [myVoteNominationId, setMyVoteNominationId] = useState<string | null>(null);
  // Starts false when there's no period to load at all — avoids ever
  // needing to setState synchronously from the mount effect below purely
  // to reset it back to false for that case (nominations' own initial `[]`
  // already renders correctly with no period, with nothing to reset).
  const [loading, setLoading] = useState(Boolean(period));
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Pure data-fetcher — deliberately contains no setState calls itself.
  // Every call site below applies the result via its own explicit .then()
  // callback instead, matching RoomPollsPanel's exact established shape
  // (Phase 17) — the lint rule this codebase runs under only recognizes
  // setState as "deferred, not a synchronous effect side-effect" when it's
  // lexically inside a .then()/subscription callback literal, not inside a
  // plain helper function called from the effect body.
  const load = useCallback(() => {
    if (!period) return Promise.resolve(null);
    const supabase = createClient();
    return fetchNominations(supabase, { periodId: period.id, currentUserId });
  }, [period, currentUserId]);

  const applyLoadResult = useCallback((result: Awaited<ReturnType<typeof load>>) => {
    setLoading(false);
    if (!result) return;
    if (result.error) {
      setError(result.error);
      return;
    }
    setNominations(result.nominations);
    setMyVoteNominationId(result.myVoteNominationId);
  }, []);

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (active) applyLoadResult(result);
    });
    return () => {
      active = false;
    };
  }, [load, applyLoadResult]);

  // Realtime for new/approved nominations + a periodic soft-refresh for
  // vote totals while voting is open — same disclosed substitute as
  // RoomPollsPanel (Phase 17): award_votes' RLS only exposes a voter's own
  // row, so a live push of *other* members' vote counts isn't possible
  // without weakening that RLS, which is out of scope.
  useEffect(() => {
    if (!period) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`award-nominations-${period.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "award_nominations", filter: `period_id=eq.${period.id}` },
        () => {
          load().then(applyLoadResult);
        },
      )
      .subscribe();

    const interval =
      period.status === "voting_open"
        ? setInterval(() => {
            load().then(applyLoadResult);
          }, VOTE_TOTALS_REFRESH_MS)
        : null;

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [period, load, applyLoadResult]);

  async function handleVote(nominationId: string) {
    if (!period || voting || myVoteNominationId) return;
    setVoting(true);
    setVoteError(null);
    const supabase = createClient();
    const { error: castError } = await castAwardVote(supabase, { periodId: period.id, nominationId, voterProfileId: currentUserId });
    setVoting(false);
    if (castError) {
      setVoteError(castError);
      return;
    }
    setMyVoteNominationId(nominationId);
    load().then(applyLoadResult);
  }

  const pendingNominations = nominations.filter((n) => n.status === "pending");
  const approvedNominations = nominations.filter((n) => n.status === "approved");
  const totalVotes = approvedNominations.reduce((sum, n) => sum + n.voteCount, 0);
  const myPendingNomination = nominations.find((n) => n.status === "pending" && n.nominatedBy === currentUserId);

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <AwardPeriodAdminPanel
          category={category}
          period={period}
          pendingNominations={pendingNominations}
          winner={winner}
          approvedNominations={approvedNominations}
          onChanged={onPeriodChanged}
        />
      ) : null}

      {!period ? (
        <EmptyState icon={<CrownIcon size={28} />} title={`No ${category.name} period yet`} description="Check back once a moderator starts one." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-base font-semibold text-ink">{period.periodLabel}</p>
              <p className="text-xs text-text-muted">
                {new Date(period.periodStart).toLocaleDateString()} – {new Date(period.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <Badge tone={period.status === "voting_open" ? "red" : "outline"}>{STATUS_COPY[period.status]}</Badge>
          </div>

          {period.status === "announced" && winner ? <WinnerAnnouncement winner={winner} /> : null}

          {period.status === "nominations_open" ? (
            myPendingNomination ? (
              <p className="rounded-control border border-ink/10 bg-bg-elevated px-4 py-3 text-sm text-text-muted">
                Your nomination for <span className="text-ink">{myPendingNomination.nominee.display_name || myPendingNomination.nominee.username}</span> is pending review.
              </p>
            ) : (
              <NominationForm periodId={period.id} currentUserId={currentUserId} onSubmitted={() => load().then(applyLoadResult)} />
            )
          ) : null}

          {error ? (
            <p className="text-sm text-red-hover">{error}</p>
          ) : loading ? (
            <div className="flex flex-col gap-2" aria-live="polite" aria-label="Loading nominees">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-control bg-ink/5" />
              ))}
            </div>
          ) : approvedNominations.length > 0 && (period.status === "voting_open" || period.status === "closed" || period.status === "announced") ? (
            <div className="flex flex-col gap-2">
              {voteError ? <p className="text-sm text-red-hover">{voteError}</p> : null}
              {approvedNominations.map((nomination) => (
                <NomineeVoteCard
                  key={nomination.id}
                  nomination={nomination}
                  totalVotes={totalVotes}
                  isMyVote={myVoteNominationId === nomination.id}
                  votingOpen={period.status === "voting_open" && !myVoteNominationId}
                  voting={voting}
                  onVote={handleVote}
                />
              ))}
            </div>
          ) : period.status === "voting_open" ? (
            <p className="text-sm text-text-muted">No approved nominees yet.</p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Compact winners archive — shown beneath both category panels, newest first, across both categories. */
function WinnersHistory({ winners }: { winners: AwardWinner[] }) {
  if (winners.length === 0) return null;
  return (
    <div className="mt-8 border-t border-ink/10 pt-6">
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-text-muted">Past Winners</h2>
      <div className="flex flex-col gap-2">
        {winners.map((winner) => {
          const name = winner.nomination.nominee.display_name || winner.nomination.nominee.username;
          return (
            <Card key={winner.id} className="!p-3 flex items-center gap-3">
              <Avatar url={winner.nomination.nominee.avatar_url} name={name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                <p className="truncate text-xs text-text-muted">{winner.categoryName}</p>
              </div>
              <span className="shrink-0 text-xs text-text-muted">{winner.voteCount.toLocaleString()} votes</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function AwardsHub({ categories, initialPeriods, initialWinners, currentUserId, canManage }: AwardsHubProps) {
  const [activeCategoryKey, setActiveCategoryKey] = useState(categories[0]?.key ?? "");
  const [periods, setPeriods] = useState(initialPeriods);
  const [winners, setWinners] = useState(initialWinners);
  const [advancing, setAdvancing] = useState(false);
  const [advanceLog, setAdvanceLog] = useState<string[] | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [{ periods: freshPeriods }, { winners: freshWinners }] = await Promise.all([fetchAwardPeriods(supabase), fetchWinners(supabase)]);
    setPeriods(freshPeriods);
    setWinners(freshWinners);
  }, []);

  // Realtime for period status transitions across both categories — low
  // enough volume (at most a couple of active periods at a time) that one
  // unfiltered subscription, reconciled by a full refetch, is simpler and
  // just as correct as per-period filtering would be.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("award-periods")
      .on("postgres_changes", { event: "*", schema: "public", table: "award_periods" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const currentPeriodByCategory = useMemo(() => {
    const map = new Map<string, AwardPeriod>();
    for (const period of periods) {
      const existing = map.get(period.categoryId);
      if (!existing || new Date(period.periodStart) > new Date(existing.periodStart)) {
        map.set(period.categoryId, period);
      }
    }
    return map;
  }, [periods]);

  const winnerByPeriodId = useMemo(() => new Map(winners.map((w) => [w.periodId, w])), [winners]);

  async function handleAdvance() {
    if (advancing) return;
    setAdvancing(true);
    setAdvanceError(null);
    setAdvanceLog(null);
    const supabase = createClient();
    const { log, error: advanceRpcError } = await advancePeriods(supabase);
    setAdvancing(false);
    if (advanceRpcError) {
      setAdvanceError(advanceRpcError);
      return;
    }
    setAdvanceLog(log);
    refresh();
  }

  if (categories.length === 0) {
    return <EmptyState icon={<CrownIcon size={28} />} title="Awards aren't set up yet" description="Check back soon." />;
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <div className="flex flex-col gap-2 rounded-card border border-ink/10 bg-bg-elevated p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Period lifecycle automation</p>
              <p className="text-xs text-text-muted">
                A Vercel Cron job also runs this automatically — use this to advance every category&apos;s period right now instead of waiting for the next scheduled run.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handleAdvance} loading={advancing} disabled={advancing} className="shrink-0">
              Run now
            </Button>
          </div>
          {advanceError ? <p className="text-sm text-red-hover">{advanceError}</p> : null}
          {advanceLog ? (
            advanceLog.length > 0 ? (
              <ul className="flex flex-col gap-1 border-t border-ink/10 pt-2 text-xs text-text-muted">
                {advanceLog.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-ink/10 pt-2 text-xs text-text-muted">Nothing to do yet — no period has hit its next milestone.</p>
            )
          ) : null}
        </div>
      ) : null}

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-ink/10">
        {categories.map((category) => {
          const isActive = activeCategoryKey === category.key;
          return (
            <button
              key={category.key}
              type="button"
              role="tab"
              id={`award-tab-${category.key}`}
              aria-selected={isActive}
              aria-controls={`award-tabpanel-${category.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveCategoryKey(category.key)}
              className={`relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                isActive ? "text-ink" : "text-text-muted hover:text-ink"
              }`}
            >
              {category.name}
              {isActive ? <span className="absolute inset-x-0 -bottom-px h-0.5 bg-red-primary" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      {categories.map((category) => {
        if (activeCategoryKey !== category.key) return null;
        const period = currentPeriodByCategory.get(category.id) ?? null;
        return (
          <div key={category.key} role="tabpanel" id={`award-tabpanel-${category.key}`} aria-labelledby={`award-tab-${category.key}`}>
            <CategoryPanel
              category={category}
              period={period}
              winner={period ? winnerByPeriodId.get(period.id) ?? null : null}
              currentUserId={currentUserId}
              canManage={canManage}
              onPeriodChanged={refresh}
            />
          </div>
        );
      })}

      <WinnersHistory winners={winners} />
    </div>
  );
}
