import "react-native-url-polyfill/auto";

import type { Database } from "@fanhub/shared";
import { createClient } from "@supabase/supabase-js";

import { LargeSecureStore } from "./secureStore";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy apps/mobile/.env.example to apps/mobile/.env.local and fill in the values from the Supabase dashboard (same project the web app uses).",
  );
}

/**
 * The single Supabase client for the mobile app — same project, same
 * `profiles`/RLS/auth as the web app, so a user with an existing FanHub web
 * account can sign into this app with the same credentials. Unlike the web
 * app (which needs separate browser/server/service clients for Next.js SSR),
 * mobile only ever needs one client: there's no server-rendering boundary,
 * and the service-role key must never exist in mobile code at all (see
 * apps/mobile/.env.example).
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    // No `window.location` in React Native — session establishment from a
    // signup-confirmation/password-reset link is instead handled explicitly
    // via handleAuthDeepLink.ts, triggered off Linking events.
    detectSessionInUrl: false,
    // PKCE (not the older implicit flow) — matches the web app's own
    // @supabase/ssr client (which defaults to PKCE), so confirmation/reset
    // emails triggered from mobile carry the same `?code=` shape that
    // src/app/auth/callback/route.ts already knows how to exchange, just
    // consumed here instead via supabase.auth.exchangeCodeForSession().
    flowType: "pkce",
  },
});
