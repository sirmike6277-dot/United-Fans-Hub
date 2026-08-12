"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon, UsersIcon } from "@/components/members/MembersIcons";
import {
  fetchRoleDefinitions,
  fetchAllRoleGrants,
  searchProfiles,
  grantRole,
  revokeRole,
  type RoleDefinition,
} from "@/lib/admin/roles";
import type { FeedAuthor } from "@/lib/community/posts";

export interface AdminRolesManagerProps {
  currentUserId: string;
}

/**
 * The one capability this phase's admin surface exists to provide: let a
 * super_admin grant/revoke roles — genuinely nothing else could, since
 * `user_roles` had zero RLS policies before migration 024. Deliberately
 * small: no broader admin dashboard, no unrelated settings, matching the
 * phase's explicit "minimum required" scope.
 */
export function AdminRolesManager({ currentUserId }: AdminRolesManagerProps) {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [profiles, setProfiles] = useState<FeedAuthor[]>([]);
  const [grants, setGrants] = useState<Map<string, Set<string>>>(new Map());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    Promise.all([fetchRoleDefinitions(supabase), fetchAllRoleGrants(supabase), searchProfiles(supabase, "")]).then(
      ([roleDefs, grantResult, initialProfiles]) => {
        if (!active) return;
        setLoading(false);
        setRoles(roleDefs);
        if (grantResult.error) {
          setError(grantResult.error);
        } else {
          const map = new Map<string, Set<string>>();
          for (const g of grantResult.grants) {
            const set = map.get(g.profileId) ?? new Set<string>();
            set.add(g.roleKey);
            map.set(g.profileId, set);
          }
          setGrants(map);
        }
        setProfiles(initialProfiles);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const supabase = createClient();
      searchProfiles(supabase, query).then(setProfiles);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function toggleRole(profileId: string, role: RoleDefinition, currentlyGranted: boolean) {
    const key = `${profileId}:${role.id}`;
    setPendingKey(key);
    setError(null);

    const supabase = createClient();
    const { error: actionError } = currentlyGranted
      ? await revokeRole(supabase, { profileId, roleId: role.id })
      : await grantRole(supabase, { profileId, roleId: role.id, grantedBy: currentUserId });

    setPendingKey(null);

    if (actionError) {
      setError(actionError);
      return;
    }

    setGrants((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(profileId) ?? []);
      if (currentlyGranted) set.delete(role.key);
      else set.add(role.key);
      next.set(profileId, set);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        icon={<SearchIcon size={18} />}
        placeholder="Search by name or username"
        aria-label="Search profiles"
        className="max-w-md"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error ? <p className="text-sm text-red-hover">{error}</p> : null}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-white/5" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState icon={<UsersIcon size={28} />} title="No profiles match your search" />
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map((profile) => {
            const name = profile.display_name || profile.username;
            const granted = grants.get(profile.id) ?? new Set<string>();
            return (
              <div key={profile.id} className="flex flex-col gap-2 rounded-card border border-white/10 bg-bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar url={profile.avatar_url} name={name} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{name}</p>
                    <p className="truncate text-xs text-text-muted">@{profile.username}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((role) => {
                    const isGranted = granted.has(role.key);
                    const key = `${profile.id}:${role.id}`;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(profile.id, role, isGranted)}
                        disabled={pendingKey === key}
                        aria-pressed={isGranted}
                        title={role.description ?? role.name}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                          isGranted ? "bg-red-primary text-white" : "border border-white/20 text-text-muted hover:text-white"
                        }`}
                      >
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
