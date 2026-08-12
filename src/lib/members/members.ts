import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";
import { fetchFollowingSet } from "@/lib/community/follows";

export const MEMBERS_PAGE_SIZE = 20;

export interface MemberWithFollowState extends FeedAuthor {
  isFollowing: boolean;
}

type AnySupabase = SupabaseClient<Database>;

/**
 * Escapes a user-typed search term so it can never be interpreted as
 * anything other than a literal substring: backslash-escapes the ILIKE
 * wildcards (`%`, `_`, `\`), and strips characters meaningful to
 * PostgREST's `.or()` filter-string syntax (`,`, `(`, `)`) — none of which
 * are legal in a username/display name anyway (see username_format).
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, "");
}

/**
 * One page of the member directory — a lean public-identity projection
 * (reusing the existing FeedAuthor shape, not a new near-duplicate type)
 * rather than `select("*")`. The profiles table is fully public via RLS,
 * but there's no reason to fetch or ship fields a directory card doesn't
 * render. Excludes the current user (you don't need to "discover"
 * yourself) and searches only username/display_name — the two fields
 * confirmed searchable during inspection; nothing else is indexed or
 * public-identity-relevant.
 */
export async function fetchMembersPage(
  supabase: AnySupabase,
  { from, to, currentUserId, query }: { from: number; to: number; currentUserId: string; query: string },
): Promise<{ members: MemberWithFollowState[]; error: string | null }> {
  let request = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level")
    .neq("id", currentUserId)
    .order("username", { ascending: true })
    .range(from, to);

  const trimmed = query.trim();
  if (trimmed.length > 0) {
    const term = sanitizeSearchTerm(trimmed);
    request = request.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  }

  const { data, error } = await request;

  if (error) {
    return { members: [], error: "Couldn't load members. Please try again." };
  }

  const members = (data ?? []) as FeedAuthor[];
  // One batched follow-state query for the whole page — not one per card.
  const followingSet = await fetchFollowingSet(supabase, {
    currentUserId,
    profileIds: members.map((m) => m.id),
  });

  return {
    members: members.map((m) => ({ ...m, isFollowing: followingSet.has(m.id) })),
    error: null,
  };
}
