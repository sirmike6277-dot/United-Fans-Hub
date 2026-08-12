import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string | null;
  criteria: unknown;
}

/** The badge catalog (migration 023) — publicly readable, seeded once, never fabricated per-row. */
export async function fetchBadgeCatalog(supabase: AnySupabase): Promise<{ badges: Badge[]; error: string | null }> {
  const { data, error } = await supabase.from("badges").select("id, key, name, description, criteria").order("name");

  if (error) {
    return { badges: [], error: "Couldn't load the badge catalog. Please try again." };
  }

  return { badges: (data ?? []) as Badge[], error: null };
}

export interface FanStats {
  /** null means "unknown to this viewer" (predictions are RLS'd to their owner — see fetchFanStats), not "zero". */
  predictionsCorrect: number | null;
  commentsCount: number;
  postsCount: number;
  memberSinceIso: string | null;
}

/**
 * Every number here is a real, independently-verifiable count against this
 * fan's own rows — nothing derived from `criteria` or invented for display.
 * One failing count degrades to 0 rather than failing the whole page (an
 * under-count is misleading for at most one badge; a blank Achievements
 * page is worse).
 */
export async function fetchFanStats(
  supabase: AnySupabase,
  { profileId, predictionsCorrect }: { profileId: string; predictionsCorrect: number | null },
): Promise<FanStats> {
  const [postsResult, commentsResult, profileResult] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", profileId).eq("status", "published"),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("author_id", profileId).eq("status", "published"),
    supabase.from("profiles").select("created_at").eq("id", profileId).single(),
  ]);

  return {
    predictionsCorrect,
    postsCount: postsResult.count ?? 0,
    commentsCount: commentsResult.count ?? 0,
    memberSinceIso: profileResult.data?.created_at ?? null,
  };
}

export type BadgeStatus =
  | { state: "earned" }
  | { state: "in-progress"; current: number; threshold: number }
  | { state: "not-tracked" };

/**
 * Pure evaluation — a badge's `criteria` JSON against this fan's real stats.
 * Two criteria types (streak_days, reactions_received) aren't tracked
 * anywhere in the schema yet, so they're always "not-tracked" rather than
 * silently defaulting to 0/locked-forever, which would misrepresent a
 * missing feature as a fan simply not having earned it.
 */
export function evaluateBadge(criteria: unknown, stats: FanStats): BadgeStatus {
  if (typeof criteria !== "object" || criteria === null) return { state: "not-tracked" };
  const c = criteria as { type?: string; threshold?: number };
  const threshold = typeof c.threshold === "number" ? c.threshold : 0;

  let current: number | null = null;
  switch (c.type) {
    case "predictions_correct":
      // null means this viewer can't see the real number (predictions are
      // private to their owner) — "not tracked for you", never "0/10".
      if (stats.predictionsCorrect === null) return { state: "not-tracked" };
      current = stats.predictionsCorrect;
      break;
    case "comments_count":
      current = stats.commentsCount;
      break;
    case "posts_count":
      current = stats.postsCount;
      break;
    case "member_tenure_years": {
      if (!stats.memberSinceIso) return { state: "not-tracked" };
      const years = (Date.now() - new Date(stats.memberSinceIso).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      current = years;
      break;
    }
    default:
      return { state: "not-tracked" };
  }

  if (current === null) return { state: "not-tracked" };
  if (current >= threshold) return { state: "earned" };
  return { state: "in-progress", current: Math.floor(current), threshold };
}
