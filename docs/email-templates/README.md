# Email templates

Nothing in this folder deploys automatically on `git push` — Supabase's Auth
email templates live in the Supabase project itself (Dashboard or Management
API), not in this repo's build. The five `.html` files here are the source
of truth, kept under version control so they're reviewable/diffable like any
other code, and **all five are currently live** — applied via
`apply-via-api.sh` and independently re-verified with a fresh `GET` straight
after (correct crest domain, correct subject, correct byte length matching
each file exactly, red masthead branding present). If any of these files
are edited again, re-run `apply` for that type — nothing pushes itself.

## The five templates

| Type | File | Dashboard location | Subject | Real app logic that triggers it |
| --- | --- | --- | --- | --- |
| Confirm signup | `confirm-signup.html` | Authentication → Email Templates → Confirm signup | `Confirm your email - United Fans Hub` | `SignupForm.tsx` → `supabase.auth.signUp()` |
| Invite user | `invite.html` | Authentication → Email Templates → Invite user | `You're invited to United Fans Hub` | `AdminInviteUserPanel.tsx` → `POST /api/admin/invite-user` (super_admin-gated) → `auth.admin.inviteUserByEmail()` |
| Reset password | `recovery.html` | Authentication → Email Templates → Reset Password | `Reset your password - United Fans Hub` | `ForgotPasswordForm.tsx` / Settings' "Send password reset link" → `resetPasswordForEmail()` |
| Change email address | `email-change.html` | Authentication → Email Templates → Change Email Address | `Confirm your new email address - United Fans Hub` | Settings → Account → "Change email" → `supabase.auth.updateUser({ email })` |
| Reauthentication | `reauthentication.html` | Authentication → Email Templates → Reauthentication | `{{ .Token }} is your United Fans Hub verification code` | Settings → Account → "Change password directly" → `reauthenticate()` then `updateUser({ password, nonce })` |

Apply any of them the same way the original was applied — see "Apply the
templates" below (Dashboard paste, or the generalized `apply-via-api.sh`).

## Shared design system

**Crest image — a hosted URL, pointing at a real, deployed PNG.**
This took four attempts to get right on the very first template
(`confirm-signup.html`) — recorded here so it doesn't get re-broken by a
future edit, and every other template reuses the same fix from the start:

1. Hot-linked to the production PNG before it was ever deployed → 404,
   broken image in the real email — confirmed via `curl -I`.
2. "Fixed" by embedding the crest as a base64 `data:` URI directly in the
   HTML. Verified by rendering the template in a headless browser with all
   network requests blocked and confirming the crest still displayed — but
   that only proves the HTML mechanism is *valid*, not that real email
   clients honor it. **Gmail specifically strips/ignores base64 `data:`
   URIs in `<img src>`** and shows nothing — which is exactly the "broken
   logo" reported after actually receiving the email. It also pushed the
   template over Supabase's 50,000-character body limit.
3. Tried a hosted `.webp` URL instead — still reported broken. **WebP is
   only partially/unreliably supported across Gmail and Outlook** — not a
   safe bet for a hosted email image either.
4. **Current fix, used by all five templates**: hosted URL pointing at
   `https://united-fans-hub.vercel.app/images/branding/manchester-united-emblem.png`
   — PNG is the universal answer for a real `<img src>` in email. Before
   pasting any of these templates into Supabase, confirm the PNG is
   actually live: `curl -I` that URL should return `200`, not `404`.

**Lesson (matters if any of these are touched again): a hosted URL pointing
at a real, deployed PNG/JPEG is the only image mechanism that's reliably
correct across real email clients for this Supabase field.**

**Header — a masthead.** Crest and wordmark side by side (crest in a white
circle plate, "United Fans Hub" + an "AN INDEPENDENT SUPPORTERS COMMUNITY"
tagline beside it) on a red-to-deep-red diagonal gradient, thin gold trim
line underneath. All gradients/shadows/border-radius carry a solid
`bgcolor`/`background-color` fallback on the same element, so Outlook
desktop (which ignores all three) falls back to flat brand red with square
corners rather than breaking.

**Palette — white card on a white page**, 1px light border + soft shadow for
definition. Footer sits on a barely-off-white panel (`#f7f7f8`).

**Type system.** Georgia (serif, italic) for display moments — header
wordmark, welcome/headline text; Arial/Helvetica (sans) for everything else.
No `@font-face`/web fonts — unreliable in email.

**Encoding — ASCII-only** in every template (HTML entities like `&mdash;`,
`&rsquo;` instead of literal unicode), so pasting through a browser textarea
can't silently mangle it via an encoding mismatch.

**Links never shown as raw text.** A `{{ .ConfirmationURL }}` value (a
supabase.co link with a token in it) is never printed as visible text — the
button and the "Trouble with the button?" fallback are both `<a href>` links
with clean anchor text. The link target is unchanged either way.

**Reauthentication is deliberately different.** It's the one template with
no button and no `{{ .ConfirmationURL }}` — Supabase's own documented
default for this type is Token-only (a 6-digit code, no link variant
exists). `reauthentication.html` swaps the CTA button for a large,
letter-spaced code chip instead, keeping the same masthead/footer/palette.

## Re-applying after an edit

All five are live as of this writing (see the note at the top). If any
template file here is edited again, it needs to be re-applied — nothing in
this repo pushes it automatically.

**Dashboard** (one at a time): Authentication → Email Templates → pick the
type from the table above → paste the Subject and the file's full contents.

**Or via the Management API**, using the generalized
[`apply-via-api.sh`](./apply-via-api.sh) (originally written for
Confirm signup only — three separate dashboard paste-and-save attempts had
silently kept serving the OLD template despite the editor appearing to
accept the paste; this script proves definitively what's saved server-side):

```
./apply-via-api.sh <kind> check   # GET what's currently saved
./apply-via-api.sh <kind> apply   # PATCH with the local .html file
./apply-via-api.sh <kind> check   # GET again to confirm it changed
```

`<kind>` is one of `confirmation | invite | recovery | email_change |
reauthentication`. Requires `SUPABASE_ACCESS_TOKEN` (see the script's own
header comment for where to get one and where to put it — never in chat).

## Required manual Supabase Dashboard settings

### URL Configuration — FIXED directly, but one more manual step remains

**Bug found and fixed this build**: real password-reset (and every other
auth) emails were landing users on `united-fans-hub.vercel.app` instead of
the real custom domain, `www.manutdfanshub.com`. Root cause, confirmed by
querying the live config (`GET /v1/projects/{ref}/config/auth`), not
assumed:

| Field | Before | After (fixed via the Management API this build) |
| --- | --- | --- |
| `site_url` | `https://united-fans-hub.vercel.app/` | `https://www.manutdfanshub.com` |
| `uri_allow_list` | `https://united-fans-hub.vercel.app/,http://localhost:3000/` | `https://www.manutdfanshub.com/**,https://manutdfanshub.com/**,https://united-fans-hub.vercel.app/**,http://localhost:3000/**` |

Without an entry matching the app's `emailRedirectTo`/`redirectTo` value,
Supabase silently substitutes the Site URL instead of honoring the
requested redirect — that's exactly why every real `redirectTo` the app
already correctly requests (`window.location.origin` from
`ForgotPasswordForm.tsx`, `SettingsShell.tsx`, `SocialAuthButtons.tsx`, or
`getSiteUrl()` from the server-side invite route) was silently getting
overridden back to the stale Vercel URL. This allowlist is also the actual
security boundary against an open redirect, independent of the `next`-path
validation done in `src/app/auth/callback/route.ts`. Verified via
`curl -I https://www.manutdfanshub.com/` (200, real deployment — the bare
apex `manutdfanshub.com` 308-redirects to the `www` subdomain, so `www.` is
the canonical form used everywhere above) before making this change, and
re-fetched the config afterward to confirm it actually persisted.

**Follow-up, no longer a required manual step**: the previous version of
this section said `NEXT_PUBLIC_SITE_URL` needed to be set in Vercel's own
project environment variables (separate from anything in this repo) —
turned out it was **never set at all** there (confirmed directly by the
project owner, not assumed), which meant the server-side fallback in
`src/lib/site-url.ts` silently became `http://localhost:3000` in
*production* — a dead link for a real recipient, not just the wrong domain.
That one place it mattered: the admin "Invite user" route's `redirectTo`
(a Route Handler always runs server-only, so it never has `window` to read
the real origin from).

Fixed in code instead of requiring the dashboard step: `getSiteUrl()` now
checks Vercel's own auto-injected `VERCEL_ENV` system variable (present in
every Vercel environment, zero configuration needed) before falling back
to `http://localhost:3000`, and uses the real production domain when it's
set. `NEXT_PUBLIC_SITE_URL` still overrides it if ever explicitly set (e.g.
to pin a specific preview deployment), but is no longer required for
correctness in production.

### Email delivery (SMTP) — already configured, nothing to do here

Resend via `smtp.resend.com`, sending as `noreply@manutdfanshub.com` on the
verified `manutdfanshub.com` domain — a real signup has been received and
successfully verified end-to-end, and the Invite/Change-email flows were
both verified live this same way (real `auth.users` rows created/updated,
confirmed via SQL) during this build.

### Secure password change — REQUIRED for Reauthentication to actually enforce the code

**This is the one setting that isn't optional if the Reauthentication
template is meant to do its job.** Verified directly against this project
this build: with **Secure password change** left at its current (off)
setting, `supabase.auth.updateUser({ password, nonce })` accepts *any*
`nonce` value — a deliberately wrong 6-digit code still completed the
password change successfully (confirmed by then failing to sign in with the
old password). `reauthenticate()` itself works correctly regardless — a
real code is generated and really emailed (confirmed via
`auth.users.reauthentication_token`/`reauthentication_sent_at` being
populated) — but without this toggle, the server never actually checks that
the code submitted back matches it.

Turn it on: **Authentication → Providers → Email → Secure password change**.
Once enabled, `updateUser({ password, nonce })` rejects an incorrect/expired
nonce instead of silently accepting it.
