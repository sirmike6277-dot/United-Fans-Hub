"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RefreshIcon } from "@/components/community/CommunityIcons";
import { SearchIcon, UsersIcon } from "./MembersIcons";
import { MemberCard } from "./MemberCard";
import { MemberCardSkeleton } from "./MemberCardSkeleton";
import { fetchMembersPage, MEMBERS_PAGE_SIZE, type MemberWithFollowState } from "@/lib/members/members";

const SEARCH_DEBOUNCE_MS = 350;

export interface MembersDirectoryProps {
  currentUserId: string;
  initialMembers: MemberWithFollowState[];
  initialError: string | null;
  initialHasMore: boolean;
}

export function MembersDirectory({
  currentUserId,
  initialMembers,
  initialError,
  initialHasMore,
}: MembersDirectoryProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState(initialError);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const isFirstRun = useRef(true);
  const requestId = useRef(0);

  // Debounce the search box before it triggers a fetch.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  async function runSearch(term: string) {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { members: results, error: fetchError } = await fetchMembersPage(supabase, {
      from: 0,
      to: MEMBERS_PAGE_SIZE - 1,
      currentUserId,
      query: term,
    });

    // A newer search started while this one was in flight — drop this result.
    if (thisRequest !== requestId.current) return;

    setLoading(false);
    if (fetchError) {
      setError(fetchError);
      return;
    }
    setMembers(results);
    setHasMore(results.length === MEMBERS_PAGE_SIZE);
  }

  // Re-run the search (always restarting at page one) whenever the
  // debounced term changes — skipped on mount since initialMembers already
  // covers the empty-query first page from the server.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    runSearch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setError(null);

    const supabase = createClient();
    const from = members.length;
    const { members: next, error: fetchError } = await fetchMembersPage(supabase, {
      from,
      to: from + MEMBERS_PAGE_SIZE - 1,
      currentUserId,
      query: debouncedQuery,
    });

    setLoadingMore(false);

    if (fetchError) {
      setError(fetchError);
      return;
    }

    setMembers((prev) => [...prev, ...next]);
    setHasMore(next.length === MEMBERS_PAGE_SIZE);
  }

  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 pb-6 sm:pb-8">
      <Input
        icon={<SearchIcon size={18} />}
        placeholder="Search by name or username"
        aria-label="Search members"
        className="max-w-md"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-ink/10 bg-bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => runSearch(debouncedQuery)}>
            <RefreshIcon />
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MemberCardSkeleton />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-ink/10 bg-bg-surface p-10 text-center">
          <UsersIcon size={28} />
          <p className="font-display text-lg font-semibold text-ink">
            {isSearching ? "No members match your search" : "No other members yet"}
          </p>
          <p className="text-sm text-text-muted">
            {isSearching
              ? "Try a different name or username."
              : "Check back once more fans have joined the community."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                initialIsFollowing={member.isFollowing}
              />
            ))}
          </div>

          {loadingMore ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MemberCardSkeleton />
              <MemberCardSkeleton />
            </div>
          ) : hasMore ? (
            <div className="flex justify-center py-2">
              <Button variant="secondary" size="sm" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-text-muted">
              You&apos;ve reached the end of the list.
            </p>
          )}
        </>
      )}
    </div>
  );
}
