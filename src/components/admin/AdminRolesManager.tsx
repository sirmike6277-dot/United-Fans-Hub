"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon, UsersIcon } from "@/components/members/MembersIcons";
import {
  fetchRoleDefinitions,
  fetchAllRoleGrants,
  searchProfiles,
  grantRole,
  revokeRole,
  ADMIN_PROFILES_PAGE_SIZE,
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
 *
 * 20-per-page with "Load more" — same pattern as MembersDirectory.tsx.
 * Was a flat, unpaginated `.limit(20)` fetch with no way to reach anyone
 * past the first 20 (alphabetically); that's the bug this fixes.
 */
export function AdminRolesManager({ currentUserId }: AdminRolesManagerProps) {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [profiles, setProfiles] = useState<FeedAuthor[]>([]);
  const [grants, setGrants] = useState<Map<string, Set<string>>>(new Map());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const isFirstRun = useRef(true);
  const requestId = useRef(0);

  async function runSearch(term: string) {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { profiles: results, error: fetchError } = await searchProfiles(supabase, {
      query: term,
      from: 0,
      to: ADMIN_PROFILES_PAGE_SIZE - 1,
    });

    // A newer search started while this one was in flight — drop this result.
    if (thisRequest !== requestId.current) return;

    setLoading(false);
    if (fetchError) {
      setError(fetchError);
      return;
    }
    setProfiles(results);
    setHasMore(results.length === ADMIN_PROFILES_PAGE_SIZE);
  }

  // Initial load: role definitions, every current grant, and page one of
  // profiles — in parallel, same shape as the original effect.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    Promise.all([
      fetchRoleDefinitions(supabase),
      fetchAllRoleGrants(supabase),
      searchProfiles(supabase, { query: "", from: 0, to: ADMIN_PROFILES_PAGE_SIZE - 1 }),
    ]).then(([roleDefs, grantResult, profileResult]) => {
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
      setProfiles(profileResult.profiles);
      setHasMore(profileResult.profiles.length === ADMIN_PROFILES_PAGE_SIZE);
    });
    return () => {
      active = false;
    };
  }, []);

  // Debounce the search box before it triggers a fetch.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Re-run the search (always restarting at page one) whenever the
  // debounced term changes — skipped on mount since the initial effect
  // above already covers the empty-query first page.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    runSearch(debouncedQuery);
  }, [debouncedQuery]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setError(null);

    const supabase = createClient();
    const from = profiles.length;
    const { profiles: next, error: fetchError } = await searchProfiles(supabase, {
      query: debouncedQuery,
      from,
      to: from + ADMIN_PROFILES_PAGE_SIZE - 1,
    });

    setLoadingMore(false);

    if (fetchError) {
      setError(fetchError);
      return;
    }

    setProfiles((prev) => [...prev, ...next]);
    setHasMore(next.length === ADMIN_PROFILES_PAGE_SIZE);
  }

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
            <div key={i} className="h-16 animate-pulse rounded-card bg-ink/5" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState icon={<UsersIcon size={28} />} title="No profiles match your search" />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {profiles.map((profile) => {
              const name = profile.display_name || profile.username;
              const granted = grants.get(profile.id) ?? new Set<string>();
              return (
                <div key={profile.id} className="flex flex-col gap-2 rounded-card border border-ink/10 bg-bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 hover:underline">
                    <Avatar url={profile.avatar_url} name={name} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{name}</p>
                      <p className="truncate text-xs text-text-muted">@{profile.username}</p>
                    </div>
                  </Link>
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
                            isGranted ? "bg-red-primary text-white" : "border border-ink/20 text-text-muted hover:text-ink"
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

          {loadingMore ? (
            <div className="flex flex-col gap-2">
              <div className="h-16 animate-pulse rounded-card bg-ink/5" />
              <div className="h-16 animate-pulse rounded-card bg-ink/5" />
            </div>
          ) : hasMore ? (
            <div className="flex justify-center py-2">
              <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-text-muted">You&apos;ve reached the end of the list.</p>
          )}
        </>
      )}
    </div>
  );
}
