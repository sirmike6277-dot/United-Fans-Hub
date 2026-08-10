"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/auth/FormError";
import { ImageIcon, CloseIcon } from "./CommunityIcons";
import type { CurrentUser } from "./PostCard";
import type { FeedPost } from "@/lib/community/posts";

const MAX_IMAGES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — a client-side courtesy limit, not a storage-level restriction.
const MAX_BODY_LENGTH = 2000;

export interface PostComposerProps {
  currentUser: CurrentUser;
  clubId: string;
  onPostCreated: (post: FeedPost) => void;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

export function PostComposer({ currentUser, clubId, onPostCreated }: PostComposerProps) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = (body.trim().length > 0 || images.length > 0) && !submitting;

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0) return;

    setError(null);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_IMAGES} images per post.`);
      return;
    }

    const accepted: PendingImage[] = [];
    let rejected = false;
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        rejected = true;
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected = true;
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (files.length > room) {
      setError(`You can attach up to ${MAX_IMAGES} images per post — only the first ${room} were added.`);
    } else if (rejected) {
      setError("Some files were skipped — images only, up to 8MB each.");
    }

    setImages((prev) => [...prev, ...accepted]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function resetComposer() {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setBody("");
    setImages([]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const trimmedBody = body.trim();

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({ author_id: currentUser.id, club_id: clubId, body: trimmedBody || null })
      .select("id, created_at")
      .single();

    if (postError || !post) {
      setSubmitting(false);
      setError("Couldn't publish your post. Please try again.");
      return;
    }

    // Post exists now — associate media through post_media, per the existing
    // storage/schema architecture. Uploads run after post creation by design
    // (see task instructions); a failed upload doesn't roll back the post,
    // it's surfaced as a clear, separate notice instead.
    const mediaRows: FeedPost["media"] = [];
    let failedUploads = 0;

    for (let index = 0; index < images.length; index += 1) {
      const { file } = images[index];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${currentUser.id}/${post.id}/${index}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file);
      if (uploadError) {
        failedUploads += 1;
        continue;
      }

      const { data: mediaRow, error: mediaError } = await supabase
        .from("post_media")
        .insert({ post_id: post.id, media_type: "image", storage_path: path, order_index: index })
        .select("id, storage_path, media_type, order_index")
        .single();

      if (mediaError || !mediaRow) {
        failedUploads += 1;
        continue;
      }

      mediaRows.push(mediaRow);
    }

    setSubmitting(false);

    onPostCreated({
      id: post.id,
      body: trimmedBody || null,
      createdAt: post.created_at,
      authorId: currentUser.id,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        display_name: currentUser.displayName,
        avatar_url: currentUser.avatarUrl,
        fan_level: currentUser.fanLevel,
      },
      media: mediaRows,
      reactionCount: 0,
      commentCount: 0,
      hasReacted: false,
    });

    if (failedUploads > 0) {
      const plural = failedUploads === 1 ? "image" : "images";
      setNotice(`Post published — ${failedUploads} ${plural} couldn't be uploaded.`);
    }

    resetComposer();
  }

  return (
    <Card className="!p-4 sm:!p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? <FormError message={error} /> : null}
        {notice ? (
          <div
            role="status"
            className="rounded-control border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-body"
          >
            {notice}
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <Avatar url={currentUser.avatarUrl} name={currentUser.displayName} size={44} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
            rows={2}
            maxLength={MAX_BODY_LENGTH}
            placeholder="Share something with the community..."
            aria-label="Post text"
            className="min-h-[3.25rem] flex-1 resize-none rounded-control border border-white/10 bg-bg-elevated px-4 py-3 text-sm text-white placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary sm:text-base"
          />
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.map((img, index) => (
              <div key={img.previewUrl} className="relative aspect-square overflow-hidden rounded-control bg-bg-elevated">
                <Image src={img.previewUrl} alt="" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label="Remove image"
                  disabled={submitting}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary disabled:opacity-50"
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting || images.length >= MAX_IMAGES}
            aria-label="Add images"
            className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-text-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
          >
            <ImageIcon />
            <span className="hidden sm:inline">Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="sr-only"
          />

          <Button type="submit" size="sm" loading={submitting} disabled={!canSubmit}>
            {submitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
