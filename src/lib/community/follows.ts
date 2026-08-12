import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

/**
 * Whether `currentUserId` already follows `targetProfileId`. `follows` is
 * publicly readable via RLS, so this is a plain existence check, not a
 * privileged read.
 */
export async function fetchFollowState(
  supabase: AnySupabase,
  { currentUserId, targetProfileId }: { currentUserId: string; targetProfileId: string },
): Promise<{ isFollowing: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetProfileId)
    .maybeSingle();

  if (error) {
    return { isFollowing: false, error: "Couldn't load follow status." };
  }
  return { isFollowing: Boolean(data), error: null };
}

/** Follower/following counts for a profile — shown on /profile and /profile/[id]. */
export async function fetchFollowCounts(
  supabase: AnySupabase,
  profileId: string,
): Promise<{ followers: number; following: number; error: string | null }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
  ]);

  if (followersRes.error || followingRes.error) {
    return { followers: 0, following: 0, error: "Couldn't load follower counts." };
  }
  return { followers: followersRes.count ?? 0, following: followingRes.count ?? 0, error: null };
}

/** Every profile id `currentUserId` follows — used to filter the feed's "Following" tab. */
export async function fetchFollowingIds(supabase: AnySupabase, currentUserId: string): Promise<string[]> {
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", currentUserId);
  return (data ?? []).map((row) => row.following_id);
}

/**
 * Batch follow-state lookup for a page of member/profile cards — one query
 * instead of one-per-card, mirroring fetchFeedPage's own reactedPostIds
 * pattern.
 */
export async function fetchFollowingSet(
  supabase: AnySupabase,
  { currentUserId, profileIds }: { currentUserId: string; profileIds: string[] },
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();

  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId)
    .in("following_id", profileIds);

  return new Set((data ?? []).map((row) => row.following_id));
}

/**
 * The database is already the real security boundary here — `follows_check`
 * (CHECK follower_id <> following_id) and the (follower_id, following_id)
 * primary key make self-follow and duplicate-follow rows impossible to
 * create, confirmed live against the deployed schema. The guard below is
 * purely a fast, friendly UI error for a case the interface itself never
 * offers (no Follow button is ever rendered on your own profile/card) —
 * it is not the thing actually preventing the attack.
 */
export async function followProfile(
  supabase: AnySupabase,
  { currentUserId, targetProfileId }: { currentUserId: string; targetProfileId: string },
): Promise<{ error: string | null }> {
  if (currentUserId === targetProfileId) {
    return { error: "You can't follow yourself." };
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: currentUserId, following_id: targetProfileId });

  if (error) {
    // unique_violation — already following (e.g. a duplicate click racing
    // an earlier request). Idempotent: the desired end state already holds.
    if (error.code === "23505") return { error: null };
    return { error: "Couldn't follow this fan. Please try again." };
  }
  return { error: null };
}

export async function unfollowProfile(
  supabase: AnySupabase,
  { currentUserId, targetProfileId }: { currentUserId: string; targetProfileId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetProfileId);

  if (error) {
    return { error: "Couldn't unfollow. Please try again." };
  }
  return { error: null };
}
