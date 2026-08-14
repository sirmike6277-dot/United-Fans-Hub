"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/auth/FormError";
import { ImageIcon, CloseIcon } from "./CommunityIcons";
import { VideoIcon } from "@/components/community/RoomIcons";
import { MentionAutocomplete } from "./MentionAutocomplete";
import type { CurrentUser } from "./PostCard";
import { POST_CATEGORIES, type FeedAuthor, type FeedPost, type PostCategory } from "@/lib/community/posts";
import {
  activeMentionQuery,
  applyMention,
  createMentions,
  extractMentionedUsernames,
  resolveMentionedProfiles,
  searchMentionCandidates,
} from "@/lib/community/mentions";

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — a client-side courtesy limit, not a storage-level restriction.
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB — a short clip, not a full match recording.
const MAX_BODY_LENGTH = 2000;

export interface PostComposerProps {
  currentUser: CurrentUser;
  clubId: string;
  onPostCreated: (post: FeedPost) => void;
}

interface PendingImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

interface PendingVideo {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

const CATEGORY_LABELS: Record<PostCategory, string> = {
  general: "General Chat",
  matchday: "Matchday",
  transfers: "Transfers",
};

/** Reads a file's real pixel dimensions before upload — this is what lets the feed size a post's media box to the photo/clip's actual shape instead of cropping or letterboxing it into a fixed one (see PostMedia.tsx and migration add_post_media_dimensions). */
function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = url;
  });
}

function readVideoDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => resolve({ width: video.videoWidth || 16, height: video.videoHeight || 9 });
    video.onerror = () => resolve({ width: 16, height: 9 });
    video.src = url;
  });
}

export function PostComposer({ currentUser, clubId, onPostCreated }: PostComposerProps) {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<PostCategory>("general");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [video, setVideo] = useState<PendingVideo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<FeedAuthor[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRequestId = useRef(0);

  const canSubmit = (body.trim().length > 0 || images.length > 0 || video !== null) && !submitting;

  async function handleBodyChange(value: string, cursorPos: number) {
    setBody(value);
    const query = activeMentionQuery(value, cursorPos);
    if (query === null || query.length === 0) {
      setMentionCandidates([]);
      return;
    }

    const thisRequest = ++mentionRequestId.current;
    const candidates = await searchMentionCandidates(createClient(), { query, excludeId: currentUser.id });
    if (thisRequest !== mentionRequestId.current) return;
    setMentionCandidates(candidates);
  }

  function selectMention(username: string) {
    const el = textareaRef.current;
    const cursorPos = el?.selectionStart ?? body.length;
    const { value, cursorPos: nextCursor } = applyMention(body, cursorPos, username);
    setBody(value);
    setMentionCandidates([]);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0) return;

    setError(null);
    // Images and a video are mutually exclusive on one post — adding a
    // photo while a video is attached replaces the video, and vice versa
    // (see the Video button handler), so this only ever needs to make
    // room within the image cap itself.
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_IMAGES} images per post.`);
      return;
    }

    const candidates = files.slice(0, room);
    const accepted: PendingImage[] = [];
    let rejected = false;

    for (const file of candidates) {
      if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
        rejected = true;
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const { width, height } = await readImageDimensions(previewUrl);
      accepted.push({ file, previewUrl, width, height });
    }

    if (files.length > room) {
      setError(`You can attach up to ${MAX_IMAGES} images per post — only the first ${room} were added.`);
    } else if (rejected) {
      setError("Some files were skipped — images only, up to 8MB each.");
    }

    setVideo(null);
    setImages((prev) => [...prev, ...accepted]);
  }

  async function handleVideoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("video/")) {
      setError("That file isn't a video.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Videos can't be larger than ${MAX_VIDEO_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await readVideoDimensions(previewUrl);

    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setVideo({ file, previewUrl, width, height });
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function removeVideo() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  }

  function resetComposer() {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    if (video) URL.revokeObjectURL(video.previewUrl);
    setBody("");
    setCategory("general");
    setImages([]);
    setVideo(null);
    setMentionCandidates([]);
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
      .insert({ author_id: currentUser.id, club_id: clubId, body: trimmedBody || null, category })
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

    const attachments = video
      ? [{ file: video.file, mediaType: "video" as const, width: video.width, height: video.height }]
      : images.map((img) => ({ file: img.file, mediaType: "image" as const, width: img.width, height: img.height }));

    for (let index = 0; index < attachments.length; index += 1) {
      const { file, mediaType, width, height } = attachments[index];
      const ext = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
      const path = `${currentUser.id}/${post.id}/${index}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file);
      if (uploadError) {
        failedUploads += 1;
        continue;
      }

      const { data: mediaRow, error: mediaError } = await supabase
        .from("post_media")
        .insert({ post_id: post.id, media_type: mediaType, storage_path: path, order_index: index, width, height })
        .select("id, storage_path, media_type, order_index, width, height")
        .single();

      if (mediaError || !mediaRow) {
        failedUploads += 1;
        continue;
      }

      mediaRows.push(mediaRow);
    }

    // Best-effort, same non-blocking treatment as the image uploads above:
    // mentions never roll back or delay the post, which is already live.
    const mentionedUsernames = extractMentionedUsernames(trimmedBody);
    let mentionRefs: { id: string; username: string }[] = [];
    if (mentionedUsernames.length > 0) {
      const resolved = await resolveMentionedProfiles(supabase, mentionedUsernames);
      mentionRefs = resolved.filter((p) => p.id !== currentUser.id);
      if (mentionRefs.length > 0) {
        await createMentions(supabase, { postId: post.id, mentionedProfileIds: mentionRefs.map((m) => m.id) });
      }
    }

    setSubmitting(false);

    onPostCreated({
      id: post.id,
      body: trimmedBody || null,
      category,
      createdAt: post.created_at,
      authorId: currentUser.id,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        display_name: currentUser.displayName,
        avatar_url: currentUser.avatarUrl,
        fan_level: currentUser.fanLevel,
        // Optimistic local echo of a post this same viewer just published —
        // real crown state (if any) refreshes from the server on next load.
        is_current_fan_of_month: false,
        is_current_fan_of_season: false,
      },
      media: mediaRows,
      reactionCount: 0,
      commentCount: 0,
      hasReacted: false,
      mentions: mentionRefs,
    });

    if (failedUploads > 0) {
      const plural = failedUploads === 1 ? (video ? "video" : "image") : "images";
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
            className="rounded-control border border-ink/10 bg-ink/5 px-4 py-3 text-sm text-text-body"
          >
            {notice}
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <Avatar url={currentUser.avatarUrl} name={currentUser.displayName} size={44} />
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => handleBodyChange(e.target.value, e.target.selectionStart)}
              disabled={submitting}
              rows={2}
              maxLength={MAX_BODY_LENGTH}
              placeholder="Share something with the community... use @ to mention a fan"
              aria-label="Post text"
              className="min-h-[3.25rem] w-full resize-none rounded-control border border-ink/10 bg-bg-elevated px-4 py-3 text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary sm:text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && mentionCandidates.length > 0) {
                  e.preventDefault();
                  selectMention(mentionCandidates[0].username);
                } else if (e.key === "Escape" && mentionCandidates.length > 0) {
                  setMentionCandidates([]);
                }
              }}
            />
            <MentionAutocomplete candidates={mentionCandidates} onSelect={selectMention} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Post category">
          {POST_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={category === key}
              disabled={submitting}
              onClick={() => setCategory(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                category === key ? "bg-red-primary text-white" : "bg-ink/5 text-text-muted hover:text-ink"
              }`}
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
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
        ) : video ? (
          <div className="relative overflow-hidden rounded-control bg-black">
            <video src={video.previewUrl} className="max-h-64 w-full" controls />
            <button
              type="button"
              onClick={removeVideo}
              aria-label="Remove video"
              disabled={submitting}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary disabled:opacity-50"
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-ink/10 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={submitting || images.length >= MAX_IMAGES || video !== null}
              aria-label="Add images"
              className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
            >
              <ImageIcon />
              <span className="hidden sm:inline">Photo</span>
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={submitting || images.length > 0}
              aria-label="Add a video"
              className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
            >
              <VideoIcon size={20} />
              <span className="hidden sm:inline">Video</span>
            </button>
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} className="sr-only" />
          <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelected} className="sr-only" />

          <Button type="submit" size="sm" loading={submitting} disabled={!canSubmit}>
            {submitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
