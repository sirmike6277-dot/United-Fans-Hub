# Fan Room logos

Per-room logo images for the Fan Rooms directory (`getRoomVisual` /
`RoomAvatar` in `src/components/community/RoomVisual.tsx`).

- `premier-league.png` — the Premier League lion crest, cropped from
  `reference designs/images (3).jpeg` (a generic web download, supplied by
  the project owner). Re-cropped tight to the icon and centred on a plain
  white square so it renders cleanly at avatar size.
- `champions-league.png` — the UEFA Champions League starball, cropped from
  `reference designs/images.png` (a generic web download, supplied by the
  project owner). Same tight-crop/centre treatment as above.
- `transfer-news.jpg` — a "TRANSFER NEWS" broadcast-style graphic, copied
  from `reference designs/transfer-news-yellow.jpg` (a generic web
  download, supplied by the project owner) and letterboxed onto a square
  canvas with its own yellow fill colour so the full wordmark stays intact
  at any crop.

None of these three were re-drawn, recolored, or traced — each is the
supplied artwork itself, only cropped/framed to fit an avatar circle
cleanly (see `RoomAvatar`'s `logoBg`/`logoFit` handling for how each is
displayed, not altered).

**Licensing status: unverified.** Unlike the four stadium photos in
`public/images/stadium/` (real Unsplash photography with a clear license),
these three are competition/broadcast trademarks/logos sourced as generic
web downloads — the same caveat already on record for
`public/images/branding/manchester-united-emblem.webp`. The Premier League
and UEFA Champions League marks in particular are actively protected
trademarks. Confirm licensing/usage rights for all three before any
public/production deployment.
