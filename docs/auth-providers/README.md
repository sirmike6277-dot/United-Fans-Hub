# Google & Apple sign-in — manual setup

`SocialAuthButtons.tsx` already calls the real
`supabase.auth.signInWithOAuth()` correctly. The "isn't set up yet" error
you see when clicking Google or Apple isn't a code bug — confirmed by
reading this project's live Supabase Auth config directly: both
`external_google_enabled` and `external_apple_enabled` are `false`, with no
client ID/secret set for either. Fixing that requires real OAuth
credentials from Google's and Apple's own developer consoles, which only
you can create (they're tied to your own developer accounts).

This doc covers exactly how to get each one, verified against Supabase's
own current documentation (not guessed) — then `apply-oauth-provider.sh`
gets the result into Supabase without ever pasting a secret into chat.

## Google (free, ~5 minutes)

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/auth/clients) (create a project first if you don't have one).
2. [Create a new OAuth client ID](https://console.cloud.google.com/auth/clients/create) → **Web application**.
3. **Authorized JavaScript origins** — add:
   - `https://www.manutdfanshub.com` (and/or `https://united-fans-hub.vercel.app`, whichever is live)
   - `http://localhost:3000` (for local dev)
4. **Authorized redirect URIs** — add:
   ```
   https://bprrrycjqpqiegkakjsm.supabase.co/auth/v1/callback
   ```
   This is **Supabase's own callback URL**, not your app's `/auth/callback` — Supabase completes the OAuth handshake with Google itself first, then redirects to your app's own `redirectTo` afterward. You can also copy this exact value from the [Google provider page in your Supabase Dashboard](https://supabase.com/dashboard/project/bprrrycjqpqiegkakjsm/auth/providers?provider=Google).
5. Click **Create** — save the **Client ID** and **Client Secret** it gives you.
6. Put both into `.env.supabase-admin.local` (in your own editor, never in chat):
   ```
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   ```
7. Run:
   ```bash
   ./docs/auth-providers/apply-oauth-provider.sh google apply
   ./docs/auth-providers/apply-oauth-provider.sh google check   # confirms it stuck
   ```

## Apple (requires a paid Apple Developer account; more involved)

Apple's flow has more moving pieces, and — unlike Google — the secret
**expires every 6 months** and has to be regenerated, or sign-in silently
breaks. Worth deciding if you want this one now or just ship with Google
first.

1. **Team ID** — the 10-character ID in the top-right of the [Apple Developer Console](https://developer.apple.com/account).
2. **App ID** — create one at [Identifiers → App IDs](https://developer.apple.com/account/resources/identifiers/list/bundleId) (e.g. `com.manutdfanshub.app`), with **Sign in with Apple** enabled in its Capabilities list.
3. **Services ID** — create a separate one at [Identifiers → Services IDs](https://developer.apple.com/account/resources/identifiers/list/serviceId) (e.g. `com.manutdfanshub.web`) — this is what Supabase calls the "client ID" for Apple, not the App ID.
4. On that Services ID, configure **Website URLs**:
   - Domain: `bprrrycjqpqiegkakjsm.supabase.co`
   - Return URL: `https://bprrrycjqpqiegkakjsm.supabase.co/auth/v1/callback`
5. Create a signing **Key** at [Keys](https://developer.apple.com/account/resources/authkeys/list) with Sign in with Apple enabled — download the `AuthKey_XXXXXXXXXX.p8` file (Apple only lets you download it once — store it safely).
6. Generate the actual client secret using Supabase's own generator tool on their [Login with Apple guide](https://supabase.com/docs/guides/auth/social-login/auth-apple) (runs client-side in your browser — "no keys leave your browser," per their own docs; needs Firefox or a Chromium browser, not Safari) — feed it your Team ID, Services ID, Key ID, and the `.p8` file content.
7. Put the Services ID and the generated secret into `.env.supabase-admin.local`:
   ```
   APPLE_OAUTH_SERVICES_ID=com.manutdfanshub.web
   APPLE_OAUTH_CLIENT_SECRET=<generated secret>
   ```
8. Run:
   ```bash
   ./docs/auth-providers/apply-oauth-provider.sh apple apply
   ./docs/auth-providers/apply-oauth-provider.sh apple check
   ```
9. **Set a calendar reminder for ~5 months from now** — the generated secret expires at 6 months and needs regenerating (step 6 again) or Apple sign-in will start failing for real users with no warning.

## After either one is applied

Test on the real signup/login pages — the button should redirect to the
provider's actual consent screen instead of showing the "isn't set up yet"
error.
