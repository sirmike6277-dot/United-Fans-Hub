import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

export interface ProfileRoleBadge {
  roleKey: string;
  roleName: string;
}

/**
 * Display priority when a profile holds more than one role — highest
 * shown first (and, in RoleBadge, the only one shown, to keep a post
 * header from turning into a wall of pills). Anything not in this list
 * (there isn't one currently — these are the 5 seeded roles) sorts last.
 */
const ROLE_PRIORITY = ["super_admin", "moderator", "content_manager", "match_manager", "award_manager"];

function priorityOf(roleKey: string): number {
  const index = ROLE_PRIORITY.indexOf(roleKey);
  return index === -1 ? ROLE_PRIORITY.length : index;
}

/**
 * Module-level cache, not component state — the same profile (a prolific
 * poster, say) can appear in many PostCard/MemberCard instances on one
 * page, and role membership changes rarely enough that de-duping identical
 * lookups within a page session is a clear win over one request per
 * instance. Keyed by profile ID; a fetch already in flight is awaited
 * rather than duplicated.
 */
const cache = new Map<string, Promise<ProfileRoleBadge[]>>();

/**
 * Fetches the publicly-visible role badges for a single profile, via the
 * batching RPC below — used by the self-fetching RoleBadge component. Sits
 * on top of fetchRoleBadgesFor (batch) purely for the cache/de-dupe
 * behavior; callers that already have a page's worth of author IDs upfront
 * (a feed page, a members list) should call fetchRoleBadgesFor directly
 * with the whole batch instead of one-by-one, to get a single round trip.
 */
export async function fetchRoleBadgesForProfile(supabase: AnySupabase, profileId: string): Promise<ProfileRoleBadge[]> {
  const cached = cache.get(profileId);
  if (cached) return cached;

  const promise = fetchRoleBadgesFor(supabase, [profileId]).then((map) => map.get(profileId) ?? []);
  cache.set(profileId, promise);
  return promise;
}

/**
 * Batch form — one round trip for every profile ID passed in. Returns a
 * map so callers can look up each profile's badges by ID; a profile with
 * no roles simply has no entry (not an empty array) unless it's also
 * populated into the single-profile cache above, which normalizes that.
 */
export async function fetchRoleBadgesFor(supabase: AnySupabase, profileIds: string[]): Promise<Map<string, ProfileRoleBadge[]>> {
  const map = new Map<string, ProfileRoleBadge[]>();
  if (profileIds.length === 0) return map;

  const { data, error } = await supabase.rpc("get_profile_role_badges", { target_profile_ids: profileIds });
  if (error || !data) return map;

  for (const row of data) {
    const list = map.get(row.profile_id) ?? [];
    list.push({ roleKey: row.role_key, roleName: row.role_name });
    map.set(row.profile_id, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => priorityOf(a.roleKey) - priorityOf(b.roleKey));
  }

  // Seed the single-profile cache too, so a later fetchRoleBadgesForProfile
  // call for one of these same profiles (e.g. re-rendering the same author
  // elsewhere on the page) hits the cache instead of refetching.
  for (const id of profileIds) {
    cache.set(id, Promise.resolve(map.get(id) ?? []));
  }

  return map;
}
