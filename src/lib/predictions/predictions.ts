import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

/** V1 score-input bounds — a plain sanity range, not a rule derived from any competition data. */
export const MIN_SCORE = 0;
export const MAX_SCORE = 20;

export const PREDICTION_SELECT = `
  id,
  profile_id,
  match_id,
  predicted_home_score,
  predicted_away_score,
  predicted_first_scorer_id,
  predicted_motm_id,
  submitted_at,
  first_scorer:players!predictions_predicted_first_scorer_id_fkey ( id, full_name ),
  motm:players!predictions_predicted_motm_id_fkey ( id, full_name ),
  prediction_scores ( points_awarded, breakdown, scored_at )
` as const;

export interface PredictionScore {
  pointsAwarded: number;
  breakdown: unknown;
  scoredAt: string;
}

export interface Prediction {
  id: string;
  matchId: string;
  profileId: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedFirstScorerId: string | null;
  predictedFirstScorerName: string | null;
  predictedMotmId: string | null;
  predictedMotmName: string | null;
  submittedAt: string;
  score: PredictionScore | null;
}

interface PredictionRow {
  id: string;
  profile_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_first_scorer_id: string | null;
  predicted_motm_id: string | null;
  submitted_at: string;
  // Resolved via explicit FK-hinted embeds (never a generic/polymorphic
  // join) — this keeps working correctly even for a player later
  // transferred out of the current squad, unlike looking a name up in a
  // separately-fetched "current squad" list.
  first_scorer: { id: string; full_name: string } | null;
  motm: { id: string; full_name: string } | null;
  // prediction_scores.prediction_id is UNIQUE + FK'd to predictions.id, so
  // PostgREST treats this as a to-one embed (an object, not an array) —
  // unlike post_media/match_events, whose FKs are not unique.
  prediction_scores: { points_awarded: number; breakdown: unknown; scored_at: string } | null;
}

function normalizePrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    profileId: row.profile_id,
    matchId: row.match_id,
    predictedHomeScore: row.predicted_home_score,
    predictedAwayScore: row.predicted_away_score,
    predictedFirstScorerId: row.predicted_first_scorer_id,
    predictedFirstScorerName: row.first_scorer?.full_name ?? null,
    predictedMotmId: row.predicted_motm_id,
    predictedMotmName: row.motm?.full_name ?? null,
    submittedAt: row.submitted_at,
    score: row.prediction_scores
      ? {
          pointsAwarded: row.prediction_scores.points_awarded,
          breakdown: row.prediction_scores.breakdown,
          scoredAt: row.prediction_scores.scored_at,
        }
      : null,
  };
}

/** A match is locked for prediction purposes purely by kickoff time — no separate deadline, no dependency on the unused `predictions.locked_at` column, per the approved V1 design. */
export function isMatchLocked(kickoffAtIso: string): boolean {
  return Date.now() >= new Date(kickoffAtIso).getTime();
}

/** The authenticated user's own prediction for one match, or null if they haven't submitted one. RLS (`profile_id = auth.uid()`) already scopes this to their own row regardless of what's queried — matchId + profileId together just narrow it to exactly one. */
export async function fetchPredictionForMatch(
  supabase: AnySupabase,
  { matchId, profileId }: { matchId: string; profileId: string },
): Promise<{ prediction: Prediction | null; error: string | null }> {
  const { data, error } = await supabase
    .from("predictions")
    .select(PREDICTION_SELECT)
    .eq("match_id", matchId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    return { prediction: null, error: "Couldn't load your prediction. Please try again." };
  }

  return { prediction: data ? normalizePrediction(data as unknown as PredictionRow) : null, error: null };
}

export interface PredictionInput {
  matchId: string;
  profileId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedFirstScorerId: string | null;
  predictedMotmId: string | null;
}

/**
 * Creates a new prediction. `profileId` must come from the caller's own
 * authenticated session (getClaims().sub) — never from a form field or
 * any other client-supplied source. This function does not itself enforce
 * that; the existing RLS INSERT policy (`profile_id = auth.uid() AND now()
 * < matches.kickoff_at`) is the real, authoritative enforcement — a
 * mismatched or spoofed profileId is rejected by the database regardless
 * of what this function is called with.
 */
export async function createPrediction(
  supabase: AnySupabase,
  input: PredictionInput,
): Promise<{ prediction: Prediction | null; error: string | null }> {
  const { data, error } = await supabase
    .from("predictions")
    .insert({
      match_id: input.matchId,
      profile_id: input.profileId,
      predicted_home_score: input.predictedHomeScore,
      predicted_away_score: input.predictedAwayScore,
      predicted_first_scorer_id: input.predictedFirstScorerId,
      predicted_motm_id: input.predictedMotmId,
    })
    .select(PREDICTION_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return { prediction: null, error: "You've already submitted a prediction for this match." };
    }
    return { prediction: null, error: "Couldn't submit your prediction. Please try again." };
  }

  return { prediction: normalizePrediction(data as unknown as PredictionRow), error: null };
}

/** Updates an existing prediction. The existing RLS UPDATE policy (own row AND before kickoff) is the real enforcement — this never bypasses it, and relies on it to reject any attempt to edit a locked or non-owned prediction. */
export async function updatePrediction(
  supabase: AnySupabase,
  {
    predictionId,
    predictedHomeScore,
    predictedAwayScore,
    predictedFirstScorerId,
    predictedMotmId,
  }: {
    predictionId: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    predictedFirstScorerId: string | null;
    predictedMotmId: string | null;
  },
): Promise<{ prediction: Prediction | null; error: string | null }> {
  const { data, error } = await supabase
    .from("predictions")
    .update({
      predicted_home_score: predictedHomeScore,
      predicted_away_score: predictedAwayScore,
      predicted_first_scorer_id: predictedFirstScorerId,
      predicted_motm_id: predictedMotmId,
    })
    .eq("id", predictionId)
    .select(PREDICTION_SELECT)
    .single();

  if (error) {
    return { prediction: null, error: "Couldn't update your prediction — it may already be locked." };
  }

  return { prediction: normalizePrediction(data as unknown as PredictionRow), error: null };
}

export interface SquadPlayer {
  id: string;
  fullName: string;
  position: string | null;
  shirtNumber: number | null;
}

/** Manchester United's synced squad — the only pool first-scorer/MOTM selections are drawn from (per the approved V1 decision), never every row in the global `players` table. */
export async function fetchManUtdSquad(
  supabase: AnySupabase,
  { clubId }: { clubId: string },
): Promise<{ players: SquadPlayer[]; error: string | null }> {
  const { data, error } = await supabase
    .from("players")
    .select("id, full_name, position, shirt_number")
    .eq("club_id", clubId)
    // `players` also holds rows created for historical match_events (see
    // sync.ts's resolvePlayerId) that share this same club_id but are not
    // necessarily still on the squad — squad_synced_at (set only by
    // syncSquad, cleared the moment a player drops off a later fetch) is
    // what actually scopes this to the real current squad.
    .not("squad_synced_at", "is", null)
    .order("shirt_number", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

  if (error) {
    return { players: [], error: "Couldn't load the squad. Please try again." };
  }

  return {
    players: (data ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      position: p.position,
      shirtNumber: p.shirt_number,
    })),
    error: null,
  };
}

export interface PredictionHistoryEntry extends Prediction {
  opponentName: string;
  competition: string | null;
  kickoffAt: string;
  isHome: boolean;
  matchStatus: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface PredictionHistoryRow extends PredictionRow {
  matches: {
    opponent_name: string;
    competition: string | null;
    kickoff_at: string;
    is_home: boolean;
    status: string;
    home_score: number | null;
    away_score: number | null;
  } | null;
}

/** All of the authenticated user's predictions, most recent match first — RLS already scopes this to their own rows. */
export async function fetchPredictionHistory(
  supabase: AnySupabase,
  { profileId }: { profileId: string },
): Promise<{ predictions: PredictionHistoryEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("predictions")
    .select(
      `${PREDICTION_SELECT}, matches ( opponent_name, competition, kickoff_at, is_home, status, home_score, away_score )`,
    )
    .eq("profile_id", profileId)
    .order("submitted_at", { ascending: false });

  if (error) {
    return { predictions: [], error: "Couldn't load your prediction history. Please try again." };
  }

  const rows = (data ?? []) as unknown as PredictionHistoryRow[];

  return {
    predictions: rows
      .filter((r): r is PredictionHistoryRow & { matches: NonNullable<PredictionHistoryRow["matches"]> } => r.matches !== null)
      .map((r) => ({
        ...normalizePrediction(r),
        opponentName: r.matches.opponent_name,
        competition: r.matches.competition,
        kickoffAt: r.matches.kickoff_at,
        isHome: r.matches.is_home,
        matchStatus: r.matches.status,
        homeScore: r.matches.home_score,
        awayScore: r.matches.away_score,
      })),
    error: null,
  };
}

/** One entry in `PredictionStats.recentForm` — a single already-settled match, newest-played first. */
export interface RecentFormEntry {
  matchId: string;
  opponentName: string;
  isCorrectResult: boolean;
  pointsAwarded: number;
}

export interface PredictionStats {
  /** Every prediction ever submitted, settled or not. */
  totalPredictions: number;
  /** Predictions whose match has been settled (has a prediction_scores row) — the only ones that can meaningfully be "correct" or "incorrect". */
  completedPredictions: number;
  /**
   * Predictions where `breakdown.correct_result` is true — the predicted
   * match outcome (home win / draw / away win) matched the real result.
   * This is deliberately the broadest of the three settled categories, not
   * "exact score": settle_prediction() guarantees an exact-score match
   * always implies correct_result too, so this is the natural "did you
   * call the winner" definition of a correct prediction in a score
   * predictor game. It is a strict subset of completedPredictions.
   */
  correctPredictions: number;
  /** Most recently *played* (not most recently submitted) settled matches, newest first, capped for display. */
  recentForm: RecentFormEntry[];
}

const RECENT_FORM_LIMIT = 5;

function readCorrectResult(breakdown: unknown): boolean {
  return Boolean(
    breakdown && typeof breakdown === "object" && (breakdown as Record<string, unknown>).correct_result === true,
  );
}

/**
 * Pure aggregation over an already-fetched prediction history (from
 * fetchPredictionHistory) — issues no query of its own, so it can never
 * see anything the caller doesn't already have RLS-scoped access to (their
 * own predictions only). "Recent form" is re-sorted by the match's real
 * kickoff time rather than reusing fetchPredictionHistory's
 * submitted_at-desc order, since a prediction submitted early for a
 * far-future match would otherwise misrepresent "recent" form.
 */
export function derivePredictionStats(history: PredictionHistoryEntry[]): PredictionStats {
  const completed = history.filter((h) => h.score !== null);
  const correct = completed.filter((h) => readCorrectResult(h.score?.breakdown));

  const recentForm: RecentFormEntry[] = completed
    .slice()
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .slice(0, RECENT_FORM_LIMIT)
    .map((h) => ({
      matchId: h.matchId,
      opponentName: h.opponentName,
      isCorrectResult: readCorrectResult(h.score?.breakdown),
      pointsAwarded: h.score?.pointsAwarded ?? 0,
    }));

  return {
    totalPredictions: history.length,
    completedPredictions: completed.length,
    correctPredictions: correct.length,
    recentForm,
  };
}

/**
 * Best-effort settlement trigger for one prediction, using the caller's
 * own authenticated session (never a service-role client) — the
 * settle_prediction() SECURITY DEFINER function enforces ownership and
 * match-finished status itself, so this is safe to call speculatively.
 * Errors (not finished yet, already settled, etc.) are swallowed — this
 * is an opportunistic "settle if possible" call, not a required step for
 * anything else on the page to render.
 */
export async function settlePredictionIfEligible(supabase: AnySupabase, predictionId: string): Promise<void> {
  try {
    // Supabase-js resolves with { error } rather than rejecting on a
    // database error, but the RPC call itself can still throw on a
    // genuine network failure — both paths are equally fine to swallow
    // here, since this is opportunistic.
    await supabase.rpc("settle_prediction", { p_prediction_id: predictionId });
  } catch {
    // Not finished yet, already settled, or some other expected
    // rejection from settle_prediction()'s own checks — nothing else on
    // the page depends on this succeeding.
  }
}
