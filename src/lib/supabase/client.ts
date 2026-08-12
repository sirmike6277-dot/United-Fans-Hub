import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Supabase client for use in Client Components ("use client" files) — the
 * browser-side counterpart to src/lib/supabase/server.ts. Create a fresh
 * instance per call site rather than sharing a module-level singleton, per
 * current Supabase SSR guidance.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
