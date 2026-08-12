"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.33-.17-1.96H10v3.71h5.38a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.89-1.74 2.99-4.3 2.99-7.27z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.89 6.61-2.42l-3.22-2.5c-.9.6-2.06.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20z"
      />
      <path
        fill="#FBBC05"
        d="M4.41 11.92A6 6 0 0 1 4.09 10c0-.67.12-1.32.32-1.92V5.49H1.06A10 10 0 0 0 0 10c0 1.61.39 3.14 1.06 4.51z"
      />
      <path
        fill="#EA4335"
        d="M10 3.96c1.47 0 2.79.5 3.83 1.49l2.86-2.86A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.06 5.49L4.41 8.08C5.2 5.72 7.4 3.96 10 3.96z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M14.94 10.6c-.03-2.05 1.68-3.03 1.76-3.08-.96-1.4-2.45-1.6-2.98-1.62-1.37-.14-2.63.79-3.32.79-.7 0-1.77-.77-2.9-.75-1.5.02-2.9.88-3.66 2.24-1.56 2.72-.4 6.74 1.12 8.94.74 1.08 1.63 2.28 2.79 2.24 1.11-.04 1.53-.72 2.87-.72 1.34 0 1.72.72 2.9.7 1.2-.02 1.96-1.09 2.7-2.17.6-.9.86-1.36 1.34-2.4-3.51-1.33-3.62-3.86-3.62-3.97zM12.6 3.42c.58-.7.97-1.68.86-2.65-.83.04-1.85.56-2.45 1.25-.54.62-1.02 1.62-.89 2.56.92.07 1.88-.47 2.48-1.16z" />
    </svg>
  );
}

type Provider = "google" | "apple";

/**
 * Real Supabase OAuth sign-in — calls signInWithOAuth and redirects to the
 * provider's consent screen. Does nothing useful until the corresponding
 * provider is enabled with real credentials in the Supabase dashboard
 * (Authentication → Providers); until then this will error out with
 * "provider is not enabled", surfaced below rather than hidden.
 */
export function SocialAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(provider: Provider) {
    setError(null);
    setLoadingProvider(provider);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    // On success the browser navigates away to the provider's consent
    // screen, so this only runs when signInWithOAuth couldn't even start
    // (e.g. the provider isn't configured yet).
    if (oauthError) {
      setLoadingProvider(null);
      setError(`${provider === "google" ? "Google" : "Apple"} sign-in isn't set up yet.`);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleClick("google")}
          disabled={loadingProvider !== null}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-white/15 bg-transparent text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void disabled:opacity-50"
        >
          <GoogleIcon />
          {loadingProvider === "google" ? "Redirecting..." : "Google"}
        </button>
        <button
          type="button"
          onClick={() => handleClick("apple")}
          disabled={loadingProvider !== null}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-white/15 bg-transparent text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void disabled:opacity-50"
        >
          <AppleIcon />
          {loadingProvider === "apple" ? "Redirecting..." : "Apple"}
        </button>
      </div>
      {error ? <span className="text-center text-xs text-red-hover">{error}</span> : null}
    </div>
  );
}
