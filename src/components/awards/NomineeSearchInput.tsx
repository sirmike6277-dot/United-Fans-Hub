"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { fetchMembersPage } from "@/lib/members/members";
import { SearchIcon } from "@/components/members/MembersIcons";
import type { FeedAuthor } from "@/lib/community/posts";

export interface NomineeSearchInputProps {
  currentUserId: string;
  selected: FeedAuthor | null;
  onSelect: (profile: FeedAuthor | null) => void;
}

/**
 * "Who are you nominating?" — reuses the exact same fetchMembersPage()
 * query the Members directory's own search box uses (no duplicated search
 * logic), just presented as a pick-one autocomplete instead of a paged
 * list. Unlike MentionAutocomplete (which hands back a bare username to
 * splice into text), this hands back the whole profile — the caller needs
 * the id for award_nominations.nominee_profile_id, not just a display name.
 */
export function NomineeSearchInput({ currentUserId, selected, onSelect }: NomineeSearchInputProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<FeedAuthor[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    if (selected || query.trim().length === 0) {
      // No state to clear here — the render below already hides the
      // dropdown whenever `selected` is set or the query is empty, so a
      // stale `candidates` array sitting unused in state is harmless and
      // never reaches the screen (see the `showCandidates` check).
      return;
    }
    const thisRequest = ++requestId.current;
    const supabase = createClient();
    fetchMembersPage(supabase, { from: 0, to: 7, currentUserId, query }).then(({ members }) => {
      if (thisRequest !== requestId.current) return;
      setCandidates(members);
    });
  }, [query, selected, currentUserId]);

  if (selected) {
    const name = selected.display_name || selected.username;
    return (
      <div className="flex items-center gap-2.5 rounded-control border border-red-primary/40 bg-red-primary/[0.06] px-3 py-2">
        <Avatar url={selected.avatar_url} name={name} size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="truncate text-xs text-text-muted">@{selected.username}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="shrink-0 text-xs text-text-muted underline transition-colors hover:text-white"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        icon={<SearchIcon size={16} />}
        placeholder="Search for a fan to nominate"
        aria-label="Search for a fan to nominate"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length > 0 && candidates.length > 0 ? (
        <div
          role="listbox"
          aria-label="Nominee suggestions"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-control border border-white/10 bg-bg-elevated shadow-lg"
        >
          {candidates.map((candidate) => {
            const name = candidate.display_name || candidate.username;
            return (
              <button
                key={candidate.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onSelect(candidate);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
              >
                <Avatar url={candidate.avatar_url} name={name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{name}</p>
                  <p className="truncate text-xs text-text-muted">@{candidate.username}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
