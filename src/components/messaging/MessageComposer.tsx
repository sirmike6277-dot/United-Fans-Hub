"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { FormError } from "@/components/auth/FormError";
import { ImageIcon, CloseIcon, SendIcon } from "@/components/community/CommunityIcons";
import { sendMessage, attachImageToMessage, type FeedMessage } from "@/lib/messaging/messages";
import type { ThreadCurrentUser } from "./MessageThread";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — same client-side courtesy limit as PostComposer, not a storage-level restriction.
const MAX_BODY_LENGTH = 2000;

export interface MessageComposerProps {
  conversationId: string;
  currentUser: ThreadCurrentUser;
  onSent: (message: FeedMessage) => void;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

/**
 * Text first, image second — this mirrors PostComposer's create-then-attach
 * order (insert the message row, then upload to storage and attach
 * message_media), adapted for the private message-media bucket. A
 * media-only message (no text) is schema-legal but this v1 always requires
 * at least text OR an image, same rule PostComposer already applies to
 * posts — no separate "media-only" code path was needed.
 */
export function MessageComposer({ conversationId, currentUser, onSent }: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState<PendingImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = (body.trim().length > 0 || image !== null) && !submitting;

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Only images are supported right now.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image is too large — up to 8MB.");
      return;
    }
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  function removeImage() {
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
  }

  function resetComposer() {
    if (image) URL.revokeObjectURL(image.previewUrl);
    setBody("");
    setImage(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const trimmedBody = body.trim();

    const { message, error: sendError } = await sendMessage(supabase, {
      conversationId,
      senderId: currentUser.id,
      body: trimmedBody || null,
    });

    if (sendError || !message) {
      setSubmitting(false);
      setError(sendError ?? "Couldn't send your message. Please try again.");
      // Draft is preserved — nothing is cleared on failure.
      return;
    }

    let finalMessage = message;

    if (image) {
      const { media, error: mediaError } = await attachImageToMessage(supabase, {
        conversationId,
        messageId: message.id,
        uploaderId: currentUser.id,
        file: image.file,
      });

      if (mediaError) {
        // The message itself was sent successfully — only the attachment
        // failed. Surface this distinctly rather than implying the whole
        // send failed (which would be misleading and could prompt a
        // confusing resend).
        setError("Message sent, but the image couldn't be attached.");
      } else if (media) {
        finalMessage = { ...message, media };
      }
    }

    setSubmitting(false);
    onSent(finalMessage);
    resetComposer();
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-ink/10 p-3">
      {error ? <FormError message={error} /> : null}

      {image ? (
        <div className="relative mb-2 inline-block h-24 w-24 overflow-hidden rounded-control bg-bg-elevated">
          <Image src={image.previewUrl} alt="" fill className="object-cover" />
          <button
            type="button"
            onClick={removeImage}
            aria-label="Remove image"
            disabled={submitting}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black disabled:opacity-50"
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <Avatar url={currentUser.avatarUrl} name={currentUser.displayName} size={36} className="mb-0.5" />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting || image !== null}
          aria-label="Add an image"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
        >
          <ImageIcon />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="sr-only" />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={submitting}
          rows={1}
          maxLength={MAX_BODY_LENGTH}
          placeholder="Write a message..."
          aria-label="Message text"
          className="min-h-11 flex-1 resize-none rounded-control border border-ink/10 bg-bg-elevated px-3 py-2.5 text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-red-primary text-white transition-colors hover:bg-red-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
}
