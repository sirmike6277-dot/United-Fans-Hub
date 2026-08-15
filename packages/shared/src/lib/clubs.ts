import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database.types";

type AnySupabase = SupabaseClient<Database>;

/** Same lookup the web app's /matches and /dashboard pages use — the `clubs` table is small and publicly readable. */
export async function fetchManchesterUnitedClubId(supabase: AnySupabase): Promise<string | null> {
  const { data } = await supabase.from("clubs").select("id").eq("slug", "manchester-united").single();
  return data?.id ?? null;
}
