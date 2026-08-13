# Branding assets

Two **separate** identities live here — never merge them into one file or fake logo:

- `united-fans-hub-logo.svg` — the United Fans Hub product wordmark/logo (independent brand, designed for this product).
- `manchester-united-emblem.webp` — the Manchester United emblem, supplied by the project owner (2026-08-10) and rendered by `ClubEmblem` exactly as provided.
- `manchester-united-emblem.png` — a lossless format conversion of the file above (`sips -s format png`, 2026-08-13), pixel-for-pixel the same artwork. `confirm-signup.html` hot-links this exact file as the crest's `<img src>` — PNG is the format that renders consistently across Gmail, Outlook, and Apple Mail (WebP does not; base64-embedding doesn't work in Gmail at all — see `docs/email-templates/README.md` for the full history). **Shipped via the `fix/email-crest-asset` branch/PR** — the email template only works once this file is actually deployed to production; confirm with `curl -I` before relying on it.
- `manchester-united-emblem-email.png` — the same crest again, resized to 112×112 (`sips -Z 112`, 2026-08-13). Made for an earlier approach that embedded the crest as a base64 `data:` URI directly in the email HTML — abandoned, because Gmail doesn't render base64-embedded images. **Currently unused** — kept here in case a future approach needs a pre-sized small variant. Same artwork, smaller canvas — not a redraw.

Rules:
- The Manchester United emblem must be the **actual supplied file**, rendered as-is.
- Do not recreate, redraw, approximate, recolor, or SVG-trace the emblem.
- Do not generate a placeholder crest or generic football badge as a stand-in.
- If this file is ever removed, `ClubEmblem` falls back to rendering an empty slot rather than a fake crest.

Note: this specific file was sourced from a generic web download rather than an
official press kit; club crests are trademarked, so before any public/production
deployment, confirm licensing/usage rights for this exact asset.
