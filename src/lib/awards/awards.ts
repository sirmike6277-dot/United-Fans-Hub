import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

type AnySupabase = SupabaseClient<Database>;

/** Matches award_periods.status's own CHECK constraint (migration 009) exactly — the real, deployed 5-state flow, not a simplified 3-state one. */
export const AWARD_PERIOD_STATUSES = ["upcoming", "nominations_open", "voting_open", "closed", "announced"] as const;
export type AwardPeriodStatus = (typeof AWARD_PERIOD_STATUSES)[number];

export type AwardNominationStatus = "pending" | "approved" | "rejected";

export interface AwardCategory {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

export interface AwardPeriod {
  id: string;
  categoryId: string;
  category: AwardCategory;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  nominationOpensAt: string | null;
  nominationClosesAt: string | null;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  status: AwardPeriodStatus;
}

export interface AwardNomination {
  id: string;
  periodId: string;
  nominee: FeedAuthor;
  nominatedBy: string | null;
  reason: string | null;
  status: AwardNominationStatus;
  createdAt: string;
  /** 0 until hydrated via award_vote_counts() — see fetchNominations. */
  voteCount: number;
}

export interface AwardWinner {
  id: string;
  periodId: string;
  categoryKey: string;
  categoryName: string;
  nomination: {
    id: string;
    nominee: FeedAuthor;
  };
  voteCount: number;
  announcedAt: string;
}

const CATEGORY_SELECT = "id, key, name, description";

const PERIOD_SELECT = `
  id, category_id, period_label, period_start, period_end,
  nomination_opens_at, nomination_closes_at, voting_opens_at, voting_closes_at, status,
  category:award_categories ( ${CATEGORY_SELECT} )
` as const;

const NOMINATION_SELECT = `
  id, period_id, nominated_by, reason, status, created_at,
  nominee:profiles!award_nominations_nominee_profile_id_fkey ( id, username, display_name, avatar_url, fan_level )
` as const;

interface CategoryRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

interface PeriodRow {
  id: string;
  category_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  nomination_opens_at: string | null;
  nomination_closes_at: string | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  status: string;
  category: CategoryRow | null;
}

interface NominationRow {
  id: string;
  period_id: string;
  nominated_by: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  nominee: FeedAuthor | null;
}

const FALLBACK_CATEGORY: AwardCategory = { id: "", key: "unknown", name: "Award", description: null };
const FALLBACK_NOMINEE: FeedAuthor = { id: "", username: "unknown", display_name: null, avatar_url: null, fan_level: 1 };

function normalizePeriod(row: PeriodRow): AwardPeriod {
  return {
    id: row.id,
    categoryId: row.category_id,
    category: row.category ?? FALLBACK_CATEGORY,
    periodLabel: row.period_label,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    nominationOpensAt: row.nomination_opens_at,
    nominationClosesAt: row.nomination_closes_at,
    votingOpensAt: row.voting_opens_at,
    votingClosesAt: row.voting_closes_at,
    status: row.status as AwardPeriodStatus,
  };
}

function normalizeNomination(row: NominationRow): AwardNomination {
  return {
    id: row.id,
    periodId: row.period_id,
    nominee: row.nominee ?? FALLBACK_NOMINEE,
    nominatedBy: row.nominated_by,
    reason: row.reason,
    status: row.status as AwardNominationStatus,
    createdAt: row.created_at,
    voteCount: 0,
  };
}

/** All periods, newest first — award_periods is fully public-read (migration 009), same as community_rooms/badges. */
export async function fetchAwardPeriods(supabase: AnySupabase): Promise<{ periods: AwardPeriod[]; error: string | null }> {
  const { data, error } = await supabase
    .from("award_periods")
    .select(PERIOD_SELECT)
    .order("period_start", { ascending: false });

  if (error) {
    return { periods: [], error: "Couldn't load award periods. Please try again." };
  }
  return { periods: ((data ?? []) as unknown as PeriodRow[]).map(normalizePeriod), error: null };
}

export async function fetchAwardCategories(supabase: AnySupabase): Promise<{ categories: AwardCategory[]; error: string | null }> {
  const { data, error } = await supabase.from("award_categories").select(CATEGORY_SELECT).order("name");
  if (error) return { categories: [], error: "Couldn't load award categories." };
  return { categories: (data ?? []) as AwardCategory[], error: null };
}

/**
 * Nominations for a period, with real per-nominee vote counts merged in via
 * award_vote_counts() (migration 037) — award_votes' own RLS only exposes a
 * voter's own row, so the aggregate has to come from that narrow function,
 * exactly like room_poll_results() does for Fan Room polls. Also resolves
 * the current user's own vote (the one vote row RLS lets them read) so the
 * UI can show a "you voted for X" state.
 */
export async function fetchNominations(
  supabase: AnySupabase,
  { periodId, currentUserId }: { periodId: string; currentUserId: string },
): Promise<{ nominations: AwardNomination[]; myVoteNominationId: string | null; error: string | null }> {
  const [{ data: nominationRows, error: nominationError }, { data: counts }, { data: myVote }] = await Promise.all([
    supabase.from("award_nominations").select(NOMINATION_SELECT).eq("period_id", periodId).order("created_at"),
    supabase.rpc("award_vote_counts", { p_period_id: periodId }),
    supabase.from("award_votes").select("nomination_id").eq("period_id", periodId).eq("voter_profile_id", currentUserId).maybeSingle(),
  ]);

  if (nominationError) {
    return { nominations: [], myVoteNominationId: null, error: "Couldn't load nominations." };
  }

  const countByNomination = new Map((counts ?? []).map((c) => [c.nomination_id, Number(c.votes)]));
  const nominations = ((nominationRows ?? []) as unknown as NominationRow[]).map((row) => ({
    ...normalizeNomination(row),
    voteCount: countByNomination.get(row.id) ?? 0,
  }));

  return { nominations, myVoteNominationId: myVote?.nomination_id ?? null, error: null };
}

/** Moderator/admin only (RLS-enforced, migration 035) — creates a new period in its default 'upcoming' state. */
export async function createAwardPeriod(
  supabase: AnySupabase,
  { categoryId, periodLabel, periodStart, periodEnd }: { categoryId: string; periodLabel: string; periodStart: string; periodEnd: string },
): Promise<{ periodId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("award_periods")
    .insert({ category_id: categoryId, period_label: periodLabel, period_start: periodStart, period_end: periodEnd })
    .select("id")
    .single();

  if (error || !data) {
    return { periodId: null, error: error?.message.includes("duplicate") ? "A period already exists for those exact dates." : "Couldn't create the award period." };
  }
  return { periodId: data.id, error: null };
}

/** Moderator/admin only — advances (or reverts) a period's status. The UI only ever offers the forward sequence; this itself doesn't enforce ordering beyond the column's own CHECK constraint. */
export async function transitionPeriodStatus(
  supabase: AnySupabase,
  { periodId, status }: { periodId: string; status: AwardPeriodStatus },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("award_periods").update({ status }).eq("id", periodId);
  return { error: error ? "Couldn't update the period's status." : null };
}

/**
 * Self-nomination is rejected server-side (migration 035), not just hidden
 * here — this mirrors that same rule so the UI fails fast with a clear
 * message instead of a raw RLS error, but the real boundary is the policy.
 */
export async function createNomination(
  supabase: AnySupabase,
  { periodId, nomineeProfileId, nominatedBy, reason }: { periodId: string; nomineeProfileId: string; nominatedBy: string; reason: string | null },
): Promise<{ error: string | null }> {
  if (nomineeProfileId === nominatedBy) {
    return { error: "You can't nominate yourself." };
  }
  const { error } = await supabase.from("award_nominations").insert({
    period_id: periodId,
    nominee_profile_id: nomineeProfileId,
    nominated_by: nominatedBy,
    reason: reason?.trim() || null,
  });

  if (error) {
    return { error: error.message.includes("duplicate") ? "This fan has already been nominated for this period." : "Couldn't submit the nomination." };
  }
  return { error: null };
}

/** Moderator/admin only — approves a pending nomination, making it visible/votable for everyone (RLS's "approved OR mine" SELECT rule). */
export async function reviewNomination(
  supabase: AnySupabase,
  { nominationId, status }: { nominationId: string; status: "approved" | "rejected" },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("award_nominations").update({ status }).eq("id", nominationId);
  return { error: error ? "Couldn't update the nomination." : null };
}

/**
 * Casts a vote — INSERT only, deliberately not an upsert. Unlike Fan Room
 * polls, award_votes has no UPDATE/DELETE policy at all (only INSERT +
 * SELECT-own — migration 009, unchanged this phase): once cast, a vote is
 * final for that period. This is an existing, real difference from
 * room_poll_votes, not an oversight introduced here — the UI reflects it by
 * locking the ballot after a successful vote rather than offering a
 * "change your vote" control that would just fail.
 */
export async function castAwardVote(
  supabase: AnySupabase,
  { periodId, nominationId, voterProfileId }: { periodId: string; nominationId: string; voterProfileId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("award_votes").insert({ period_id: periodId, nomination_id: nominationId, voter_profile_id: voterProfileId });
  return { error: error ? "Couldn't submit your vote. Please try again." : null };
}

/** Moderator/admin only — calls determine_award_winner() (migration 036), the narrow SECURITY DEFINER function that computes + records the winner and advances the period to 'announced' atomically. */
export async function determineWinner(supabase: AnySupabase, periodId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("determine_award_winner", { p_period_id: periodId });
  return { error: error ? error.message : null };
}

const WINNER_SELECT = `
  id, period_id, vote_count, announced_at,
  period:award_periods ( category:award_categories ( key, name ) ),
  nomination:award_nominations ( id, nominee:profiles!award_nominations_nominee_profile_id_fkey ( id, username, display_name, avatar_url, fan_level ) )
` as const;

interface WinnerRow {
  id: string;
  period_id: string;
  vote_count: number;
  announced_at: string;
  period: { category: { key: string; name: string } | null } | null;
  nomination: { id: string; nominee: FeedAuthor | null } | null;
}

/** Winners history/archive — publicly readable (migration 009), newest first. */
export async function fetchWinners(supabase: AnySupabase): Promise<{ winners: AwardWinner[]; error: string | null }> {
  const { data, error } = await supabase.from("award_winners").select(WINNER_SELECT).order("announced_at", { ascending: false });
  if (error) return { winners: [], error: "Couldn't load past winners." };

  const rows = (data ?? []) as unknown as WinnerRow[];
  return {
    winners: rows.map((row) => ({
      id: row.id,
      periodId: row.period_id,
      categoryKey: row.period?.category?.key ?? "unknown",
      categoryName: row.period?.category?.name ?? "Award",
      nomination: { id: row.nomination?.id ?? "", nominee: row.nomination?.nominee ?? FALLBACK_NOMINEE },
      voteCount: row.vote_count,
      announcedAt: row.announced_at,
    })),
    error: null,
  };
}
