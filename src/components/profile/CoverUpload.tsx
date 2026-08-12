"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export interface CoverUploadProps {
  userId: string;
  url: string | null;
  focusY: number;
  onUploaded: (publicUrl: string) => void;
  onFocusChange: (focusY: number) => void;
}

/**
 * Wide cover banner with an upload-on-click affordance, backed by Supabase
 * Storage — plus a real reposition control (see migration
 * add_profile_cover_focus). object-fit: cover on a wide, short banner can
 * easily crop out the actual subject of a taller photo; the slider lets a
 * fan slide that crop up/down and see the result live, rather than
 * guessing at a fixed centre-crop.
 */
export function CoverUpload({ userId, url, focusY, onUploaded, onFocusChange }: CoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/cover-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(path, file, { upsert: true });

    setUploading(false);

    if (uploadError) {
      setError("Upload failed. Please try a smaller image.");
      return;
    }

    const { data } = supabase.storage.from("covers").getPublicUrl(path);
    onUploaded(data.publicUrl);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-40 w-full overflow-hidden rounded-card border border-white/10 bg-bg-elevated sm:h-56"
        aria-label="Change cover image"
      >
        {url ? (
          <Image src={url} alt="" fill className="object-cover" style={{ objectPosition: `center ${focusY}%` }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            Add a cover image
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? "Uploading..." : "Change cover"}
        </span>
      </button>

      {url ? (
        <div className="flex items-center gap-3">
          <label htmlFor="cover-focus" className="text-xs text-text-muted">
            Reposition
          </label>
          <input
            id="cover-focus"
            type="range"
            min={0}
            max={100}
            value={focusY}
            onChange={(e) => onFocusChange(Number(e.target.value))}
            className="h-1.5 flex-1 accent-[var(--color-red-primary)]"
            aria-label="Vertical position of the cover image"
          />
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={uploading}
        className="sr-only"
      />
      {error ? <span className="text-xs text-red-hover">{error}</span> : null}
    </div>
  );
}
