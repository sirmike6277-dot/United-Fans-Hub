"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export interface AvatarUploadProps {
  userId: string;
  url: string | null;
  onUploaded: (publicUrl: string) => void;
}

/** Circular avatar with an upload-on-click affordance, backed by Supabase Storage. */
export function AvatarUpload({ userId, url, onUploaded }: AvatarUploadProps) {
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
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    setUploading(false);

    if (uploadError) {
      setError("Upload failed. Please try a smaller image.");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onUploaded(data.publicUrl);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-bg-void bg-bg-elevated ring-2 ring-red-primary focus-visible:outline-none focus-visible:ring-4"
        aria-label="Change profile photo"
      >
        {url ? (
          <Image src={url} alt="Your profile photo" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            Add photo
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? "Uploading..." : "Change"}
        </span>
      </button>
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
