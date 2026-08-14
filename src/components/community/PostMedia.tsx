"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { FeedPostMedia } from "@/lib/community/posts";
import { MediaLightbox, type LightboxImage } from "./MediaLightbox";
import { DownloadIcon, ExpandIcon } from "./CommunityIcons";

export interface PostMediaProps {
  media: FeedPostMedia[];
}

/** Resolves a post-media storage_path to its public URL — post-media is a public bucket (see 011_storage_buckets). */
function publicUrlFor(storagePath: string): string {
  const supabase = createClient();
  return supabase.storage.from("post-media").getPublicUrl(storagePath).data.publicUrl;
}

/**
 * Same file, but with Supabase's own `download` option — this sets
 * Content-Disposition: attachment server-side, which is what actually
 * makes a cross-origin file save instead of just navigating to it (a plain
 * `<a download>` attribute is silently ignored cross-origin in most
 * browsers, so this is the real mechanism behind every "Save" button
 * below, not that attribute alone).
 */
function downloadUrlFor(storagePath: string): string {
  const supabase = createClient();
  return supabase.storage.from("post-media").getPublicUrl(storagePath, { download: true }).data.publicUrl;
}

/** A safe, sane aspect ratio to size the container to before the browser knows the media's real one — only ever used for the (now legacy) rows uploaded before width/height were captured. */
const FALLBACK_RATIO = 16 / 9;

/**
 * A post's attached media. A single item (image or video — the common
 * case) gets the whole post-width column, sized to its own real aspect
 * ratio (captured at upload — see PostComposer and migration
 * add_post_media_dimensions) via CSS `aspect-ratio`, so nothing is cropped
 * and nothing is letterboxed with visible bars: the box is shaped like the
 * media, not the other way around. Multiple images still use a grid (the
 * normal, expected "photo grid" convention once there's more than one).
 *
 * Tapping any image opens it full-screen (MediaLightbox) with Save; a
 * multi-image post's lightbox can step between all of them. Video plays
 * inline with native controls plus an explicit fullscreen button, and its
 * own Save button — video isn't part of the shared lightbox since native
 * `<video controls>` already covers playback/scrubbing/volume far better
 * than a custom viewer would.
 */
export function PostMedia({ media }: PostMediaProps) {
  const images = media.filter((m) => m.media_type === "image");
  const lightboxImages: LightboxImage[] = images.map((item) => ({
    url: publicUrlFor(item.storage_path),
    downloadUrl: downloadUrlFor(item.storage_path),
    alt: "",
  }));
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div className="mt-3 overflow-hidden rounded-card">
        {item.media_type === "video" ? (
          <SingleVideoTile item={item} />
        ) : (
          <SingleImageTile item={item} onOpen={() => setLightboxIndex(0)} />
        )}
        {lightboxIndex !== null ? (
          <MediaLightbox
            images={lightboxImages}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        ) : null}
      </div>
    );
  }

  const gridClass = images.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-2";

  return (
    <div className={`mt-3 grid gap-1 overflow-hidden rounded-card ${gridClass}`}>
      {images.slice(0, 4).map((item, index) => (
        <MediaTile
          key={item.id}
          storagePath={item.storage_path}
          tall={images.length === 3 && index === 0}
          onOpen={() => setLightboxIndex(index)}
        />
      ))}
      {lightboxIndex !== null ? (
        <MediaLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}

/** Hard cap on a single-image tile's height — see SingleImageTile's own comment for how the width formula keeps the box itself shaped like the image instead of just clamping height and leaving the width mismatched. */
const SINGLE_IMAGE_MAX_HEIGHT = 560;

/**
 * The whole image, at its real aspect ratio — never cropped, never
 * letterboxed. Tap/click opens the full-screen lightbox.
 *
 * The box's `width` is computed as `min(100%, maxHeight * ratio)` rather
 * than left at 100% — a plain `w-full` + `aspect-ratio` + `max-height`
 * combination looks right for landscape photos, but for a portrait one
 * (e.g. a 1080×2340 phone photo) the height clamp fires while the width
 * stays stretched to the card's full width, leaving a box shaped nothing
 * like the image — `object-contain` then shrinks the image to fit that
 * mismatched box, showing it small with big black bars down both sides
 * (confirmed live: a 434×560 box for a 1080×2340 image rendered the photo
 * at only ~258px wide). Computing the width in JS from the known ratio,
 * rather than relying on the browser to derive it purely from CSS
 * `aspect-ratio` + `width: fit-content` on an otherwise-empty box (tried
 * first — collapsed to 0×0 in testing, since there's no other content to
 * size from), sidesteps that entirely: the box is always exactly
 * image-shaped, up to the card's own width for landscape photos.
 *
 * That formula only works when `item.width`/`item.height` are real — for
 * the handful of posts uploaded before post_media captured them (null on
 * both), FALLBACK_RATIO (16/9) used to be the box's *permanent* shape, and
 * for anything not actually 16:9 that reproduces the exact same
 * mismatched-box-plus-black-bars bug this whole component exists to avoid
 * (confirmed live with a real portrait poster stored with no dimensions —
 * a 434×244 16:9 box around a genuinely tall image, visible black bars
 * down both sides). FALLBACK_RATIO is now only ever the *first* paint for
 * that narrow case: `onLoad` reads the image's own real naturalWidth/
 * naturalHeight once the browser has it and reflows the box to the true
 * ratio — a one-time layout adjustment for legacy rows only, never for
 * any post uploaded after post_media started capturing dimensions (those
 * have `knownRatio` immediately and this callback is a no-op).
 */
function SingleImageTile({ item, onOpen }: { item: FeedPostMedia; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const [detectedRatio, setDetectedRatio] = useState<number | null>(null);
  const url = publicUrlFor(item.storage_path);
  const knownRatio = item.width && item.height ? item.width / item.height : null;
  const ratio = knownRatio ?? detectedRatio ?? FALLBACK_RATIO;
  const widthAtMaxHeight = SINGLE_IMAGE_MAX_HEIGHT * ratio;

  function handleLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    if (knownRatio) return; // real dimensions already came from post_media — nothing to detect
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setDetectedRatio(img.naturalWidth / img.naturalHeight);
    }
  }

  if (failed) {
    return (
      <div className="flex aspect-video items-center justify-center bg-bg-elevated text-xs text-text-muted">
        Image unavailable
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="View image full-screen"
      className="relative mx-auto block cursor-zoom-in bg-bg-elevated"
      style={{ aspectRatio: ratio, maxHeight: SINGLE_IMAGE_MAX_HEIGHT, width: `min(100%, ${widthAtMaxHeight}px)` }}
    >
      <Image src={url} alt="" fill sizes="(max-width: 640px) 100vw, 640px" className="object-contain" onError={() => setFailed(true)} onLoad={handleLoad} />
    </button>
  );
}

/**
 * Real HTML5 video playback, sized the same way — real aspect ratio, no
 * crop. Native `controls` already includes a fullscreen toggle in most
 * browsers, but it's small and easy to miss, so there's also an explicit
 * "Expand" button here that calls the same Fullscreen API directly — and a
 * Save button using the same download-URL mechanism the image lightbox
 * uses.
 */
function SingleVideoTile({ item }: { item: FeedPostMedia }) {
  const url = publicUrlFor(item.storage_path);
  const downloadUrl = downloadUrlFor(item.storage_path);
  const ratio = item.width && item.height ? item.width / item.height : FALLBACK_RATIO;
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ("webkitEnterFullscreen" in video) {
      // iOS Safari's own API — it doesn't implement the standard
      // Fullscreen API on <video> at all, only this vendor-prefixed one.
      (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
    }
  }

  return (
    <div className="group relative w-full bg-black" style={{ aspectRatio: ratio, maxHeight: 560 }}>
      <video ref={videoRef} src={url} controls className="h-full w-full" />
      <div className="pointer-events-none absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <a
          href={downloadUrl}
          download
          aria-label="Save video"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-control bg-black/60 text-white transition-colors hover:bg-black/80"
        >
          <DownloadIcon />
        </a>
        <button
          type="button"
          onClick={handleFullscreen}
          aria-label="Fullscreen"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-control bg-black/60 text-white transition-colors hover:bg-black/80"
        >
          <ExpandIcon />
        </button>
      </div>
    </div>
  );
}

function MediaTile({ storagePath, tall, onOpen }: { storagePath: string; tall: boolean; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = publicUrlFor(storagePath);

  if (failed) {
    return (
      <div className="flex aspect-video items-center justify-center bg-bg-elevated text-xs text-text-muted">
        Image unavailable
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="View image full-screen"
      className={`relative block cursor-zoom-in bg-bg-elevated ${tall ? "row-span-2 aspect-square sm:aspect-auto" : "aspect-video"}`}
    >
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-ink/5" aria-hidden="true" /> : null}
      <Image
        src={url}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 640px"
        className={`object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </button>
  );
}
