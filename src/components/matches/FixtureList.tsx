import { MatchCard } from "./MatchCard";
import type { MatchSummary } from "@/lib/matches/matches";

export interface FixtureListProps {
  title: string;
  matches: MatchSummary[];
  error: string | null;
  emptyMessage: string;
}

/**
 * Server-rendered section (no client interactivity needed — v1 has no
 * pagination/search on this list). "Loading" is represented at the route
 * level via /matches/loading.tsx rather than client state here, since the
 * entire list resolves in one synchronous server fetch.
 */
export function FixtureList({ title, matches, error, emptyMessage }: FixtureListProps) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold uppercase text-white sm:text-xl">{title}</h2>

      {error ? (
        <div className="mt-3 rounded-card border border-white/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
          {error}
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-3 rounded-card border border-white/10 bg-bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </section>
  );
}
