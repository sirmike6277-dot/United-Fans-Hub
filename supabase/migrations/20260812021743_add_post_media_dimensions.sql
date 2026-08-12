-- Real pixel dimensions of an uploaded image/video, captured client-side at
-- upload time (see PostComposer) — previously post_media stored nothing
-- about shape, so a single-image post rendered inside a fixed-aspect box
-- and either cropped the photo or, once that was changed to object-contain,
-- letterboxed it with visible bars on whichever side didn't match. Storing
-- the real width/height lets the post size its own container to the
-- image's actual aspect ratio — no crop, no letterbox, because the box is
-- shaped like the photo instead of the photo being squeezed into a fixed
-- box.
alter table public.post_media
  add column width integer,
  add column height integer;
