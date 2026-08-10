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

/** Responsive grid for a post's images — 1 large, 2 side-by-side, 3-4 in a grid. Images only in this phase (post_media also allows video/file). */
export function PostMedia({ media }: PostMediaProps) {
  const images = media.filter((m) => m.media_type === "image");
  if (images.length === 0) return null;

  const gridClass =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-2";

  return (
    <div className={`mt-3 grid gap-1 overflow-hidden rounded-card ${gridClass}`}>
      {images.slice(0, 4).map((item, index) => (
        <MediaTile
          key={item.id}
          storagePath={item.storage_path}
          tall={images.length === 3 && index === 0}
        />
      ))}
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
