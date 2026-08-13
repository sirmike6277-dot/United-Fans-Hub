/**
 * The single canonical source of truth for "what URL is this app running
 * at" — used anywhere an absolute URL back to the app itself is needed
 * (auth email redirects, the confirmation email's static asset URLs).
 *
 * Client-side, `window.location.origin` is preferred over the env var: it's
 * always exactly correct for whatever origin the visitor is actually on
 * (localhost in dev, a Vercel preview deployment, or production) with zero
 * configuration — this is the same pattern already established by
 * ForgotPasswordForm.tsx/SettingsShell.tsx's `resetPasswordForEmail` calls
 * and SocialAuthButtons.tsx's OAuth `redirectTo`, so using it here too is
 * "consistent with the existing architecture," not a new convention.
 *
 * NEXT_PUBLIC_SITE_URL is the fallback for contexts with no `window`
 * (server-rendered code, or anything statically generated) and is also the
 * one place that genuinely needs a fixed, non-window-dependent value: an
 * email's HTML has no "current origin" of its own, so the confirmation
 * email's Manchester United crest `<img>` must reference an absolute,
 * always-correct URL — that's NEXT_PUBLIC_SITE_URL, set to the real
 * production Vercel URL.
 */
export function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
