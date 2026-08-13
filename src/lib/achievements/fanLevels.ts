import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

export interface FanLevelTier {
  level: number;
  minPoints: number;
  title: string;
}

/** `fan_levels` is a small, publicly-readable lookup table (see migration 007/031) — safe to fetch in full every time, no pagination needed. */
export async function fetchFanLevels(supabase: AnySupabase): Promise<FanLevelTier[]> {
  const { data } = await supabase.from("fan_levels").select("level, min_points, title").order("level");
  return (data ?? []).map((r) => ({ level: r.level, minPoints: r.min_points, title: r.title }));
}

export interface LevelProgress {
  currentLevel: number;
  currentTitle: string;
  /** Null once a fan has reached the highest seeded tier — there's nothing further to progress toward yet. */
  nextTitle: string | null;
  nextLevelMinPoints: number | null;
  pointsIntoLevel: number;
  pointsSpanOfLevel: number | null;
  /** 0-100, only meaningful when nextLevelMinPoints is not null. */
  progressPercent: number;
}

/**
 * Pure function, no fabrication: derives progress entirely from the real
 * `fan_levels` ladder and a real `fan_points` total — the same comparison
 * sync_fan_level() itself does server-side, just read-only and client-safe.
 */
export function computeLevelProgress(fanPoints: number, levels: FanLevelTier[]): LevelProgress {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  const current = sorted.filter((l) => l.minPoints <= fanPoints).pop() ?? sorted[0];
  const next = sorted.find((l) => l.level > current.level);

  if (!next) {
    return {
      currentLevel: current.level,
      currentTitle: current.title,
      nextTitle: null,
      nextLevelMinPoints: null,
      pointsIntoLevel: fanPoints - current.minPoints,
      pointsSpanOfLevel: null,
      progressPercent: 100,
    };
  }

  const span = next.minPoints - current.minPoints;
  const into = fanPoints - current.minPoints;

  return {
    currentLevel: current.level,
    currentTitle: current.title,
    nextTitle: next.title,
    nextLevelMinPoints: next.minPoints,
    pointsIntoLevel: into,
    pointsSpanOfLevel: span,
    progressPercent: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}
