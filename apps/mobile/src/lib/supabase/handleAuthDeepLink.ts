import * as Linking from "expo-linking";

import { supabase } from "./client";

/**
 * Consumes a `manutdfanshub://auth-callback?code=...` or `.../reset-password?code=...`
 * deep link (from a signup-confirmation or password-reset email — see
 * signup.tsx/forgot-password.tsx's `emailRedirectTo`/`redirectTo`) and
 * exchanges its PKCE code for a real session, the mobile equivalent of the
 * web app's src/app/auth/callback/route.ts.
 */
export async function handleAuthDeepLink(url: string): Promise<{ ok: boolean; error?: string }> {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;

  if (typeof code !== "string") {
    return { ok: false, error: "That link is missing its confirmation code — it may be malformed." };
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return { ok: false, error: "That link has expired or was already used. Please request a new one." };
  }

  return { ok: true };
}
