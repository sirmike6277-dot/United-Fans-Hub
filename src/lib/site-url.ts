/**
 * The single canonical source of truth for "what URL is this app running
 * at" — used anywhere an absolute URL back to the app itself is needed
 * (auth email redirects — see src/app/api/admin/invite-user/route.ts).
 *
 * Client-side, `window.location.origin` is preferred over the env var: it's
 * always exactly correct for whatever origin the visitor is actually on
 * (localhost in dev, a Vercel preview deployment, or production) with zero
 * configuration — this is the same pattern already established by
 * ForgotPasswordForm.tsx/SettingsShell.tsx's `resetPasswordForEmail` calls
 * and SocialAuthButtons.tsx's OAuth `redirectTo`, so using it here too is
 * "consistent with the existing architecture," not a new convention.
 *
 * Server-side (no `window` — e.g. the invite-user Route Handler, which
 * *always* runs server-only), this used to fall back straight to
 * `NEXT_PUBLIC_SITE_URL || "http://localhost:3000"`. That was a real,
 * live bug: the actual Vercel project never had `NEXT_PUBLIC_SITE_URL` set
 * at all (confirmed directly, not assumed), so every server-generated link
 * — the admin "Invite user" email's redirectTo — was silently
 * `http://localhost:3000/reset-password` in *production*, a dead link for
 * any real recipient, not just the wrong domain.
 *
 * Fixed to not depend on that manual env var being set at all:
 * `VERCEL_ENV` is a Vercel *System* Environment Variable, auto-injected in
 * every environment Vercel itself runs (production and preview alike) with
 * zero configuration — its mere presence reliably distinguishes "running on
 * Vercel" from a genuine local `next dev` session, where it's absent.
 * `NEXT_PUBLIC_SITE_URL` still wins if someone does set it explicitly
 * (e.g. to pin a specific preview deployment's own URL); it's just no
 * longer required for the production fallback to be correct.
 */
const PRODUCTION_SITE_URL = "https://www.manutdfanshub.com";

export function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_ENV) {
    return PRODUCTION_SITE_URL;
  }
  return "http://localhost:3000";
}
