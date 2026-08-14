import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

type AnySupabase = SupabaseClient<Database>;

export interface RoleDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

export interface RoleGrant {
  profileId: string;
  roleKey: string;
  roleName: string;
  grantedAt: string;
}

/** The 5 seeded roles — publicly readable lookup data, same category as scoring_rules/fan_levels. */
export async function fetchRoleDefinitions(supabase: AnySupabase): Promise<RoleDefinition[]> {
  const { data } = await supabase.from("roles").select("id, key, name, description").order("name");
  return data ?? [];
}

/**
 * Every current role grant, super_admin-only per the "Super admins can read
 * all role grants" policy (migration 024) — a non-super_admin calling this
 * simply gets an empty result (RLS-filtered), not an error.
 */
export async function fetchAllRoleGrants(supabase: AnySupabase): Promise<{ grants: RoleGrant[]; error: string | null }> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("profile_id, granted_at, role:roles!user_roles_role_id_fkey ( key, name )")
    .order("granted_at", { ascending: false });

  if (error) {
    return { grants: [], error: "Couldn't load role grants." };
  }

  const rows = (data ?? []) as unknown as { profile_id: string; granted_at: string; role: { key: string; name: string } | null }[];
  return {
    grants: rows
      .filter((r): r is typeof r & { role: { key: string; name: string } } => r.role !== null)
      .map((r) => ({ profileId: r.profile_id, roleKey: r.role.key, roleName: r.role.name, grantedAt: r.granted_at })),
    error: null,
  };
}

/** Search profiles to grant/revoke a role against — same sanitize-then-ilike pattern as members.ts, standalone here since admin search intentionally does not exclude "yourself". */
export async function searchProfiles(supabase: AnySupabase, query: string): Promise<FeedAuthor[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season")
      .order("username")
      .limit(20);
    return data ?? [];
  }

  const term = trimmed.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, "");
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season")
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(20);
  return data ?? [];
}

export async function grantRole(
  supabase: AnySupabase,
  { profileId, roleId, grantedBy }: { profileId: string; roleId: string; grantedBy: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("user_roles").insert({ profile_id: profileId, role_id: roleId, granted_by: grantedBy });

  if (error) {
    if (error.code === "23505") return { error: null }; // already granted — idempotent
    return { error: "Couldn't grant that role. Please try again." };
  }
  return { error: null };
}

export async function revokeRole(
  supabase: AnySupabase,
  { profileId, roleId }: { profileId: string; roleId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("user_roles").delete().eq("profile_id", profileId).eq("role_id", roleId);
  return { error: error ? "Couldn't revoke that role. Please try again." : null };
}
