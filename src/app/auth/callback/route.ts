import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Only ever follow a same-origin, absolute-from-root path — never an
 * absolute URL or a protocol-relative one (`//evil.com` parses as a path
 * segment on *this* origin once concatenated, not a redirect off it, but
 * this rejects it outright rather than relying on that). `next` is
 * attacker-controlled (a plain query param), so this is the actual
 * boundary against an open redirect, not just the Supabase-side allowlist.
 */
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

/**
 * Handles two distinct Supabase redirect shapes that land here:
 *
 * 1. OAuth sign-in (Google/Apple, once configured — see
 *    SocialAuthButtons.tsx) and email-link verification (signup
 *    confirmation, magic link, password recovery) that succeeded: a `code`
 *    query param, exchanged for a real session via exchangeCodeForSession.
 *    This is the original behavior here, unchanged.
 * 2. An email link that failed — expired, already used, or otherwise
 *    invalid: Supabase redirects here with `error`/`error_code`/
 *    `error_description` instead of `code` (no code to exchange at all).
 *    Previously unhandled here — it fell through to the generic OAuth
 *    error redirect, which doesn't explain what actually happened. Now
 *    routed to a dedicated page that explains it honestly and offers a
 *    way to request a new link.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // A code was present but the exchange itself failed (e.g. reused) —
    // existing OAuth-failure behavior, unchanged.
    const oauthErrorUrl = new URL("/login", origin);
    oauthErrorUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(oauthErrorUrl);
  }

  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (errorCode || errorDescription) {
    const errorUrl = new URL("/auth/auth-code-error", origin);
    if (errorCode) errorUrl.searchParams.set("code", errorCode);
    if (errorDescription) errorUrl.searchParams.set("reason", errorDescription);
    return NextResponse.redirect(errorUrl);
  }

  // Neither a code nor a recognizable error shape — a direct/malformed hit.
  const fallbackUrl = new URL("/login", origin);
  fallbackUrl.searchParams.set("error", "oauth");
  return NextResponse.redirect(fallbackUrl);
}
