import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnySupabase = SupabaseClient<Database>;

export const SOCIAL_PLATFORMS = ["instagram", "x_twitter", "tiktok", "youtube", "facebook", "other"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  x_twitter: "X (Twitter)",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  other: "Other",
};

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  handleOrUrl: string;
}

/**
 * `social_links` has existed since early in the project (public-read,
 * owner-only write RLS, unique (profile_id, platform)) with zero UI
 * anywhere — a genuine "backend built, never surfaced" gap found during
 * this phase's audit. This is the first client code to touch it.
 */
export async function fetchSocialLinks(supabase: AnySupabase, profileId: string): Promise<SocialLink[]> {
  const { data } = await supabase
    .from("social_links")
    .select("id, platform, handle_or_url")
    .eq("profile_id", profileId)
    .order("platform");

  return (data ?? []).map((row) => ({
    id: row.id,
    platform: row.platform as SocialPlatform,
    handleOrUrl: row.handle_or_url,
  }));
}

/** One row per platform per profile (the table's own unique constraint) — upsert keeps "save" idempotent whether this platform already had a link or not. */
export async function upsertSocialLink(
  supabase: AnySupabase,
  { profileId, platform, handleOrUrl }: { profileId: string; platform: SocialPlatform; handleOrUrl: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("social_links")
    .upsert(
      { profile_id: profileId, platform, handle_or_url: handleOrUrl },
      { onConflict: "profile_id,platform" },
    );

  return { error: error ? "Couldn't save that link. Please try again." : null };
}

export async function deleteSocialLink(supabase: AnySupabase, id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("social_links").delete().eq("id", id);
  return { error: error ? "Couldn't remove that link." : null };
}
