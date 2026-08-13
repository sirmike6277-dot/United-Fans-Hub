"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "./MatchCard";
import { deriveSeasonLabel, type MatchSummary } from "@/lib/matches/matches";

export interface FixtureListProps {
  title: string;
  matches: MatchSummary[];
  error: string | null;
  emptyMessage: string;
}

const ALL_SEASONS = "all";

/**
 * Real football seasons present in `matches`, most recent first — derived
 * purely from each match's own real kickoff date (see deriveSeasonLabel),
 * never a separate "season" field or fabricated list. Returns an empty
 * array (no filter row rendered at all) when everything falls in a single
 * season, since a one-option filter has nothing to actually filter.
 */
function seasonsIn(matches: MatchSummary[]): string[] {
  const seasons = new Set(matches.map((m) => deriveSeasonLabel(m.kickoffAt)));
  return [...seasons].sort().reverse();
}

/**
 * Client component specifically for the season filter (see below) — the
 * list itself still renders every match the server fetched by default
 * (matches.ts's fetchRecentResults now pulls up to 200, not just the
 * previous default of 5 — see the phase report), this only ever narrows
 * that already-complete set further, client-side, at the visitor's choice.
 * "Loading" is still represented at the route level via /matches/loading.tsx,
 * not client state here — the full list still resolves in one synchronous
 * server fetch before this component ever mounts.
 */
export function FixtureList({ title, matches, error, emptyMessage }: FixtureListProps) {
  const seasons = useMemo(() => seasonsIn(matches), [matches]);
  const [selectedSeason, setSelectedSeason] = useState(ALL_SEASONS);

  const visible =
    selectedSeason === ALL_SEASONS
      ? matches
      : matches.filter((m) => deriveSeasonLabel(m.kickoffAt) === selectedSeason);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold uppercase text-white sm:text-xl">{title}</h2>

        {/* Only worth showing once there's actually more than one real
            season to choose between — see seasonsIn's own doc comment. */}
        {seasons.length > 1 ? (
          <div role="group" aria-label={`Filter ${title.toLowerCase()} by season`} className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSeason(ALL_SEASONS)}
              aria-pressed={selectedSeason === ALL_SEASONS}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedSeason === ALL_SEASONS
                  ? "bg-red-primary text-white"
                  : "border border-white/20 text-text-muted hover:text-white"
              }`}
            >
              All seasons
            </button>
            {seasons.map((season) => (
              <button
                key={season}
                type="button"
                onClick={() => setSelectedSeason(season)}
                aria-pressed={selectedSeason === season}
                className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums transition-colors ${
                  selectedSeason === season
                    ? "bg-red-primary text-white"
                    : "border border-white/20 text-text-muted hover:text-white"
                }`}
              >
                {season}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-card border border-white/10 bg-bg-surface p-6 text-center text-sm text-text-muted">
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-3 rounded-card border border-white/10 bg-bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            {matches.length === 0
              ? emptyMessage
              : `No matches in the ${selectedSeason} season.`}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </section>
  );
}
