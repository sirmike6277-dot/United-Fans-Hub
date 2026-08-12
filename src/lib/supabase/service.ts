import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

if (typeof window !== "undefined") {
  throw new Error("src/lib/supabase/service.ts is server-only and must not be imported into client code.");
}

/**
 * Service-role Supabase client — bypasses RLS entirely. SERVER-ONLY, and
 * currently used only by the Match Centre sync process
 * (src/lib/matches/sync.ts), which writes matches/players/match_events on
 * behalf of the system rather than any specific signed-in visitor.
 *
 * This is the correct, standard use of service_role: those tables'
 * RLS intentionally restricts writes to match_manager/super_admin (see
 * migration 008), and no anonymous or ordinary authenticated visitor
 * should gain write access just by loading the public /matches page. A
 * background/system sync process is exactly the case service_role exists
 * for — and it is never used in client code; only here, inside
 * server-only modules never imported by a "use client" component.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, a plain (non-`NEXT_PUBLIC_`) server
 * env var. Not currently configured in this environment.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on the server. It is required for Match Centre synchronization to write matches/players/match_events. Add it as a server-only environment variable (never NEXT_PUBLIC_) before sync can succeed.",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
