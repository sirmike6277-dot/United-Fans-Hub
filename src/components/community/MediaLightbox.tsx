"use client";

import { useEffect } from "react";
import { CloseIcon, DownloadIcon } from "./CommunityIcons";

export interface LightboxImage {
  url: string;
  downloadUrl: string;
  alt: string;
}

export interface MediaLightboxProps {
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * Image viewer — the "tap an image, it gets big" behaviour. A bounded
 * modal card centered over a dimmed backdrop (max-w-3xl, image capped at
 * 70vh tall), not an edge-to-edge takeover of the screen — the backdrop
 * still spans the full viewport (a modal needs that to dim/block the page
 * behind it and to catch a click-outside-to-close), but the actual content
 * — image, controls, nav arrows — stays within the card, a reasonable
 * "here's the picture, bigger" size rather than replacing the whole
 * screen. Supports multiple images (the post-media grid) with left/right
 * navigation; a single-image post just doesn't show the arrows. The
 * download button uses a separate `downloadUrl` (Supabase's
 * `getPublicUrl(path, { download: true })`, which sets
 * Content-Disposition: attachment server-side) rather than the plain
 * viewing URL — a plain `<a download>` doesn't reliably force a save for a
 * cross-origin file the way this does.
 */
export function MediaLightbox({ images, index, onIndexChange, onClose }: MediaLightboxProps) {
  const current = images[index];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < images.length - 1) onIndexChange(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    }
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [index, images.length, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-card border border-white/10 bg-cinema-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/*
          bg-cinema-elevated, not bg-bg-elevated — a real bug a pass caught:
          this header bar used the token that flips with the light theme,
          while its own close/download buttons stayed hardcoded white, so
          light mode silently went white-icon-on-near-white-bar. A photo
          lightbox is a dark viewer by convention regardless of app theme
          (same posture as the bg-black image well below it) — pinning the
          bar to the same permanently-dark surface as its buttons is the
          fix, not chasing the token everywhere it's used.
        */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
          <span className="text-xs text-text-muted">
            {images.length > 1 ? `${index + 1} / ${images.length}` : null}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <a
              href={current.downloadUrl}
              download
              aria-label="Save image"
              className="flex h-9 w-9 items-center justify-center rounded-control text-white transition-colors hover:bg-white/10"
            >
              <DownloadIcon />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-control text-white transition-colors hover:bg-white/10"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center bg-black">
          {images.length > 1 && index > 0 ? (
            <button
              type="button"
              onClick={() => onIndexChange(index - 1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element -- deliberately not next/image: this is a modal viewer sized by its own content, exactly the case next/image's fixed sizes/srcset don't fit. */}
          <img src={current.url} alt={current.alt} className="max-h-[70vh] max-w-full object-contain" />

          {images.length > 1 && index < images.length - 1 ? (
            <button
              type="button"
              onClick={() => onIndexChange(index + 1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
