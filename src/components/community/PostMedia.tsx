"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { FeedPostMedia } from "@/lib/community/posts";

export interface PostMediaProps {
  media: FeedPostMedia[];
}

/** Resolves a post-media storage_path to its public URL — post-media is a public bucket (see 011_storage_buckets). */
function publicUrlFor(storagePath: string): string {
  const supabase = createClient();
  return supabase.storage.from("post-media").getPublicUrl(storagePath).data.publicUrl;
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
 */
export function PostMedia({ media }: PostMediaProps) {
  if (media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div className="mt-3 overflow-hidden rounded-card">
        {item.media_type === "video" ? (
          <SingleVideoTile item={item} />
        ) : (
          <SingleImageTile item={item} />
        )}
      </div>
    );
  }

  const images = media.filter((m) => m.media_type === "image");
  const gridClass = images.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-2";

  return (
    <div className={`mt-3 grid gap-1 overflow-hidden rounded-card ${gridClass}`}>
      {images.slice(0, 4).map((item, index) => (
        <MediaTile key={item.id} storagePath={item.storage_path} tall={images.length === 3 && index === 0} />
      ))}
    </div>
  );
}

/** The whole image, at its real aspect ratio — never cropped, never letterboxed. */
function SingleImageTile({ item }: { item: FeedPostMedia }) {
  const [failed, setFailed] = useState(false);
  const url = publicUrlFor(item.storage_path);
  const ratio = item.width && item.height ? item.width / item.height : FALLBACK_RATIO;

  if (failed) {
    return (
      <div className="flex aspect-video items-center justify-center bg-bg-elevated text-xs text-text-muted">
        Image unavailable
      </div>
    );
  }

  return (
    <div className="relative w-full bg-bg-elevated" style={{ aspectRatio: ratio, maxHeight: 560 }}>
      <Image src={url} alt="" fill sizes="(max-width: 640px) 100vw, 640px" className="object-contain" onError={() => setFailed(true)} />
    </div>
  );
}

/** Real HTML5 video playback, sized the same way — real aspect ratio, no crop. */
function SingleVideoTile({ item }: { item: FeedPostMedia }) {
  const url = publicUrlFor(item.storage_path);
  const ratio = item.width && item.height ? item.width / item.height : FALLBACK_RATIO;

  return (
    <div className="w-full bg-black" style={{ aspectRatio: ratio, maxHeight: 560 }}>
      <video src={url} controls className="h-full w-full" />
    </div>
  );
}

function MediaTile({ storagePath, tall }: { storagePath: string; tall: boolean }) {
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
    <div
      className={`relative bg-bg-elevated ${tall ? "row-span-2 aspect-square sm:aspect-auto" : "aspect-video"}`}
    >
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden="true" /> : null}
      <Image
        src={url}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 640px"
        className={`object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
