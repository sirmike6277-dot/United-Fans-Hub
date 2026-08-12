import { Avatar } from "@/components/ui/Avatar";
import type { FeedAuthor } from "@/lib/community/posts";

export interface MentionAutocompleteProps {
  candidates: FeedAuthor[];
  onSelect: (username: string) => void;
}

/**
 * Suggestions dropdown shown under a textarea while typing "@name" — a
 * composing-time convenience only. It never decides which mentions actually
 * get created: that happens by parsing the final, submitted body against
 * real usernames (see lib/community/mentions.ts), so manually typed
 * @usernames work identically to ones picked from this list.
 */
export function MentionAutocomplete({ candidates, onSelect }: MentionAutocompleteProps) {
  if (candidates.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className="absolute z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-control border border-white/10 bg-bg-elevated shadow-lg"
    >
      {candidates.map((candidate) => {
        const name = candidate.display_name || candidate.username;
        return (
          <button
            key={candidate.id}
            type="button"
            role="option"
            aria-selected={false}
            onMouseDown={(e) => {
              // mousedown (not click) so this fires before the textarea's blur.
              e.preventDefault();
              onSelect(candidate.username);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
          >
            <Avatar url={candidate.avatar_url} name={name} size={24} />
            <span className="min-w-0 flex-1 truncate text-white">{name}</span>
            <span className="shrink-0 text-xs text-text-muted">@{candidate.username}</span>
          </button>
        );
      })}
    </div>
  );
}
