import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback landing page (Google/Apple sign-in redirects here with a
 * `code` param once a provider is actually configured in the Supabase
 * dashboard — see SocialAuthButtons.tsx). Exchanges the code for a session,
 * matching the standard Supabase SSR pattern used by /auth/confirm-style
 * flows.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const url = new URL("/login", origin);
  url.searchParams.set("error", "oauth");
  return NextResponse.redirect(url);
}
