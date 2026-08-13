/**
 * The single, shared "what season is this" logic for the whole app
 * (Phase 2A — Multi-Season Architecture). Previously this exact
 * July-cutoff math was duplicated in two places (sync.ts's
 * resolveCurrentSeason and matches.ts's now-removed deriveSeasonLabel) —
 * consolidated here so there's one canonical implementation, not two that
 * could quietly drift apart.
 *
 * Plain, universally-safe module — no server-only guard, no Supabase
 * import — because it's used both server-side (sync.ts) and client-side
 * (FixtureList.tsx's season filter pills), and does nothing but date math.
 */

export interface Season {
  /** The year the season started — API-Football's own convention (e.g. 2026 for "2026/27"), and now this app's own `matches.season` column. */
  startYear: number;
  /** Human-readable "2026/27" style label, derived purely from startYear. */
  label: string;
}

/** e.g. 2026 → "2026/27", 2099 → "2099/00" (wraps correctly past the century boundary — never breaks, just keeps counting). */
export function formatSeasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * Which season a given date falls in, using European domestic football's
 * real convention: a season starts around July and runs into the
 * following June, so anything from July onward belongs to the season
 * starting that same calendar year, and anything from January–June
 * belongs to the season that started the previous calendar year.
 *
 * UTC-based deliberately (not local time) — this app has no single "home
 * timezone" for its visitors, and a kickoff a few hours either side of
 * midnight UTC should never flip which season it's counted in depending
 * on who's looking.
 */
export function seasonForDate(date: Date): Season {
  const month = date.getUTCMonth(); // 0-indexed: 0=Jan ... 6=Jul ... 11=Dec
  const startYear = month >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return { startYear, label: formatSeasonLabel(startYear) };
}

/** Convenience wrapper for the common case of already having just the start year (e.g. a value already read from `matches.season`) and wanting the full Season shape. */
export function seasonFromStartYear(startYear: number): Season {
  return { startYear, label: formatSeasonLabel(startYear) };
}
