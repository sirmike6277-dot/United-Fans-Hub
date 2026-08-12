import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

/** Real published-post count for one profile — public data (posts are publicly readable), safe to show on any profile view. */
export async function fetchPostsCount(supabase: AnySupabase, profileId: string): Promise<number> {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", profileId)
    .eq("status", "published");
  return count ?? 0;
}

/** Real prediction count — RLS scopes `predictions` to the owner only, so this only ever returns a non-zero count when called with the caller's own session/profileId. */
export async function fetchPredictionsCount(supabase: AnySupabase, profileId: string): Promise<number> {
  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  return count ?? 0;
}
