# Email templates — manual Supabase Dashboard setup

Nothing in this folder is deployed automatically. Supabase's Auth email
templates live in the Supabase project itself (Dashboard or Management API),
not in this repo's build — `confirm-signup.html` here is the source of truth
to paste in, kept under version control so it's reviewable/diffable like any
other code.

## 1. Apply the template

Supabase Dashboard → **Authentication → Email Templates → Confirm signup**:

- **Subject**: `Confirm your email — United Fans Hub`
- **Message body**: paste the full contents of [`confirm-signup.html`](./confirm-signup.html)

The template uses only real, documented Supabase template variables —
`{{ .ConfirmationURL }}` and `{{ .Email }}` — nothing invented.

**Crest image — a hosted URL, pointing at a real, deployed PNG.**
This took four attempts to get right — recorded here so it doesn't get
re-broken by a future edit:

1. Hot-linked to the production PNG before it was ever deployed → 404,
   broken image in the real email — confirmed via `curl -I`.
2. "Fixed" by embedding the crest as a base64 `data:` URI directly in the
   HTML. Verified by rendering the template in a headless browser with all
   network requests blocked and confirming the crest still displayed — but
   that only proves the HTML mechanism is *valid*, not that real email
   clients honor it. **Gmail specifically strips/ignores base64 `data:`
   URIs in `<img src>`** and shows nothing — which is exactly the "broken
   logo" reported after actually receiving the email. It also pushed the
   template over Supabase's 50,000-character body limit (`Too big: expected
   string to have <=50000 characters`).
3. Tried a hosted `.webp` URL instead (it was the one crest file already
   deployed, confirmed live via `curl -I`) — still reported broken.
   Researched properly this time instead of assuming: **WebP is only
   partially/unreliably supported across Gmail and Outlook** — not a safe
   bet for a hosted email image either.
4. **Current fix**: hosted URL pointing at
   `https://united-fans-hub.vercel.app/images/branding/manchester-united-emblem.png`
   — PNG is the universal answer for a real `<img src>` in email, supported
   consistently across Gmail, Outlook, and Apple Mail. **This only works
   once that exact file is deployed** — it's shipped via the
   `fix/email-crest-asset` branch/PR, not the branch this template's other
   changes live on. Before pasting this template into Supabase (or
   re-pasting after any future edit), confirm the PNG is actually live:
   `curl -I https://united-fans-hub.vercel.app/images/branding/manchester-united-emblem.png`
   should return `200`, not `404`.

**Lesson (matters if this template is touched again): a hosted URL pointing
at a real, deployed PNG/JPEG is the only image mechanism that's reliably
correct across real email clients for this Supabase field.** Neither
embedding (Gmail strips `data:` URIs) nor WebP (inconsistent client
support) are safe substitutes, however appealing either looked in
isolation — verify each assumption against real client behavior, not just
against a browser render. As a side benefit, a URL reference is trivially
small, so Supabase's 50,000-character limit is a non-issue either way
(current total: ~12,900 characters).

**Header — redesigned as a masthead.** Crest and wordmark sit side by side
(crest in a white circle plate, "United Fans Hub" + an "AN INDEPENDENT
SUPPORTERS COMMUNITY" tagline beside it) on a red-to-deep-red diagonal
gradient, with a thin gold trim line underneath — a quiet nod to the gold
detailing already in the crest artwork itself, not a new invented brand
color used elsewhere. The CTA button carries a matching subtle gradient and
soft glow. All gradients/shadows/border-radius are declared alongside a
solid `bgcolor`/`background-color` fallback on the same element, so Outlook
desktop (which ignores all three) falls back to flat brand red with square
corners rather than breaking.

**Palette — white card on a white page.** The body is light, not dark: the
outer canvas and the card are both white, with the card defined by a 1px
light border + soft shadow instead of a background-color difference. The
header stays the same brand-red gradient regardless. The footer sits on a
barely-off-white panel (`#f7f7f8`) purely so it still reads as a distinct
secondary block against the white card above it.

**Type system — two deliberate voices.** Georgia (serif) is used for
display moments only — the header wordmark (italic) and the welcome
headline — for an institutional, heritage feel that suits a supporters'
club; Arial/Helvetica (sans) handles everything else (body copy, button,
footer, tagline) for clarity at small sizes. Both are near-universally
supported web-safe fonts across email clients including Outlook desktop —
deliberately not `@font-face`/web fonts, which are unreliable in email.

**Encoding — ASCII-only.** Every character in the template is plain ASCII
(typographic dashes/quotes are written as HTML entities — `&mdash;`,
`&rsquo;` — not literal unicode characters), so pasting it through a browser
textarea can't silently mangle it via an encoding mismatch.

The raw `{{ .ConfirmationURL }}` value (a supabase.co link with a token in
it) is never printed as visible text — the button and the "Trouble with the
button?" fallback are both `<a href>` links using clean anchor text
("Verify your email here"). The link target is unchanged either way.

## 2. URL Configuration (required for the button to land on this app, not localhost)

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://united-fans-hub.vercel.app`
- **Redirect URLs** (allowlist) — add both:
  - `https://united-fans-hub.vercel.app/**`
  - `http://localhost:3000/**` (so local dev signups still verify correctly)

Without an entry matching the app's `emailRedirectTo` value, Supabase
silently falls back to the Site URL instead of honoring the requested
redirect — this allowlist is also the actual security boundary against an
open redirect, independent of the `next`-path validation done in
`src/app/auth/callback/route.ts`.

## 3. Email delivery (SMTP) — already configured, nothing to do here

Applying the template above only controls what the email *looks like*.
Delivery itself (**Authentication → Providers → Email → SMTP Settings**) is
already working in production: Resend via `smtp.resend.com`, sending as
`noreply@manutdfanshub.com` on the verified `manutdfanshub.com` domain — a
real signup has been received and successfully verified end-to-end. No
action needed here; this section is left only as a record of where that
setting lives if it ever needs revisiting.
