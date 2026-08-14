import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

type AnySupabase = SupabaseClient<Database>;

export const LEADERBOARD_PAGE_SIZE = 20;

// FeedAuthor's fields are unnormalized snake_case (mirrors the raw column
// names directly, same as MemberCard's usage) — fan_points follows the
// same convention here rather than mixing camelCase onto the same object.
export interface LeaderboardEntry extends FeedAuthor {
  fan_points: number;
}

/**
 * One page of the fan leaderboard, ranked strictly by `profiles.fan_points`
 * — the same trigger-maintained, non-client-writable column already shown
 * on ProfileView/MemberCard (see migration 012: fan_points/fan_level are
 * not client-INSERT/UPDATE-able; only sync_fan_points()/sync_fan_level()
 * can write them).
 *
 * This is NOT filtered to "users who have made a prediction" — it can't
 * be: predictions/prediction_scores/point_events are all own-row-only
 * under RLS (verified during the Phase 8B inspection pass), so there is no
 * cross-user-readable signal for "has this person predicted anything" to
 * filter on. profiles.fan_points is the only cross-user-readable
 * gamification signal that exists today, so this is a general fan
 * leaderboard by total points, presented inside the Predictions
 * experience — not a prediction-points-only leaderboard. (fan_points also
 * includes non-prediction activity — posts/comments/reactions/badges/
 * awards — per the existing point_events event_type categories.)
 *
 * Tie-break: `id asc` gives every row a single, stable position — a strict
 * total order (1,2,3,4…), not "competition ranking" (1,2,2,4) where tied
 * users would share a rank. fetchMyRank() below MUST use this exact same
 * ordering, or the leaderboard's own position for a tied user and
 * fetchMyRank()'s answer could disagree.
 */
export async function fetchFanLeaderboard(
  supabase: AnySupabase,
  { from, to }: { from: number; to: number },
): Promise<{ entries: LeaderboardEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season, fan_points")
    .order("fan_points", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    return { entries: [], error: "Couldn't load the leaderboard. Please try again." };
  }

  return {
    entries: (data ?? []).map((row) => ({
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      fan_level: row.fan_level,
      is_current_fan_of_month: row.is_current_fan_of_month,
      is_current_fan_of_season: row.is_current_fan_of_season,
      fan_points: row.fan_points,
    })),
    error: null,
  };
}

/**
 * Total number of profiles on the leaderboard — every registered fan (see
 * fetchFanLeaderboard's note on why this can't be scoped to "predictors
 * only"). Used for "#N of TOTAL" display and to distinguish "you're the
 * only participant" from "no one has signed up yet".
 */
export async function fetchLeaderboardSize(
  supabase: AnySupabase,
): Promise<{ total: number; error: string | null }> {
  const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });

  if (error) {
    return { total: 0, error: "Couldn't determine the leaderboard size." };
  }

  return { total: count ?? 0, error: null };
}

export interface MyLeaderboardProfile {
  fanPoints: number;
  fanLevel: number;
}

/**
 * The caller's own fan_points/fan_level, freshly read from `profiles` —
 * never taken from client-held state, since this feeds directly into
 * fetchMyRank()'s ranking query below.
 */
export async function fetchMyLeaderboardProfile(
  supabase: AnySupabase,
  profileId: string,
): Promise<{ profile: MyLeaderboardProfile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("fan_points, fan_level")
    .eq("id", profileId)
    .single();

  if (error || !data) {
    return { profile: null, error: "Couldn't load your fan profile. Please try again." };
  }

  return { profile: { fanPoints: data.fan_points, fanLevel: data.fan_level }, error: null };
}

/**
 * The authenticated user's rank under the exact same ordering as
 * fetchFanLeaderboard (`fan_points desc, id asc`): 1 + (every row that
 * sorts strictly before this one) = (rows with strictly more points) +
 * (rows tied on points but with a lexicographically smaller id).
 *
 * `fanPoints`/`profileId` must come from a fresh read of the caller's own
 * profiles row (see fetchMyLeaderboardProfile) — never from client-supplied
 * state. There is nothing to spoof here regardless: fan_points is not
 * client-writable (migration 012), and this function only ever reads.
 */
export async function fetchMyRank(
  supabase: AnySupabase,
  { profileId, fanPoints }: { profileId: string; fanPoints: number },
): Promise<{ rank: number; error: string | null }> {
  const [aheadResult, tiedResult] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).gt("fan_points", fanPoints),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("fan_points", fanPoints)
      .lt("id", profileId),
  ]);

  if (aheadResult.error || tiedResult.error) {
    return { rank: 0, error: "Couldn't calculate your rank. Please try again." };
  }

  return { rank: (aheadResult.count ?? 0) + (tiedResult.count ?? 0) + 1, error: null };
}
