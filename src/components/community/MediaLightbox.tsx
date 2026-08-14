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
 * Full-screen image viewer — the "tap an image, it gets big" behaviour.
 * Supports multiple images (the post-media grid) with left/right
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
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="text-sm text-white/70">
          {images.length > 1 ? `${index + 1} / ${images.length}` : null}
        </span>
        <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={current.downloadUrl}
            download
            aria-label="Save image"
            className="flex h-10 w-10 items-center justify-center rounded-control text-white transition-colors hover:bg-white/10"
          >
            <DownloadIcon />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-control text-white transition-colors hover:bg-white/10"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        {images.length > 1 && index > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index - 1);
            }}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 sm:left-4"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element -- deliberately not next/image: this is a full-viewport, unconstrained-size viewer, exactly the case next/image's fixed sizes/srcset don't fit. */}
        <img
          src={current.url}
          alt={current.alt}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {images.length > 1 && index < images.length - 1 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index + 1);
            }}
            aria-label="Next image"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 sm:right-4"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
