"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { FormError } from "@/components/auth/FormError";
import { ImageIcon, EmojiIcon, CloseIcon, SendIcon } from "@/components/community/CommunityIcons";
import { FileGenericIcon, VideoIcon } from "@/components/community/RoomIcons";
import { MentionAutocomplete } from "@/components/community/MentionAutocomplete";
import { sendMessage, attachFileToMessage, MESSAGE_REACTION_EMOJIS, type FeedMessage } from "@/lib/messaging/messages";
import { readImageDimensions } from "@/lib/media/dimensions";
import {
  activeMentionQuery,
  applyMention,
  createMentions,
  extractMentionedUsernames,
  resolveMentionedProfiles,
  searchRoomMentionCandidates,
} from "@/lib/community/mentions";
import type { FeedAuthor } from "@/lib/community/posts";
import type { ThreadCurrentUser } from "@/components/messaging/MessageThread";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — same courtesy limit as PostComposer/MessageComposer
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25MB — generous enough for a short clip without inviting huge uploads
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_BODY_LENGTH = 2000;

export interface ReplyTarget {
  id: string;
  senderName: string;
  preview: string;
}

export interface RoomComposerProps {
  conversationId: string;
  currentUser: ThreadCurrentUser;
  onSent: (message: FeedMessage) => void;
  disabled?: boolean;
  disabledReason?: string;
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
}

interface PendingAttachment {
  file: File;
  previewUrl: string | null;
  kind: "image" | "video" | "file";
  /** Only ever set for `kind === "image"` — see handleFileSelected. Passed through to attachFileToMessage so MessageBubble can size the box to the photo's real shape instead of the fixed crop box it used before. */
  width: number | null;
  height: number | null;
}

function classifyFile(file: File): { kind: "image" | "video" | "file"; limit: number } {
  if (file.type.startsWith("image/")) return { kind: "image", limit: MAX_IMAGE_BYTES };
  if (file.type.startsWith("video/")) return { kind: "video", limit: MAX_VIDEO_BYTES };
  return { kind: "file", limit: MAX_FILE_BYTES };
}

/**
 * Fan Rooms' composer — the DM composer (MessageComposer.tsx) only accepts
 * images and has no reply/mention UI; this one additionally accepts video
 * and generic files, replies (parent_message_id — migration 029), and
 * @mentions restricted to real room members (migration 030). Left as a
 * separate component rather than widening MessageComposer itself, so DMs'
 * behavior is unchanged.
 */
export function RoomComposer({ conversationId, currentUser, onSent, disabled = false, disabledReason, replyTo, onCancelReply }: RoomComposerProps) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<FeedAuthor[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRequestId = useRef(0);

  const canSubmit = !disabled && (body.trim().length > 0 || attachment !== null) && !submitting;

  // Escape closes the emoji picker — same convention as
  // MessageReactionBar's own full-screen picker overlay.
  useEffect(() => {
    if (!emojiPickerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setEmojiPickerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [emojiPickerOpen]);

  async function handleBodyChange(value: string, cursorPos: number) {
    setBody(value);
    const query = activeMentionQuery(value, cursorPos);
    if (query === null || query.length === 0) {
      setMentionCandidates([]);
      return;
    }

    const thisRequest = ++mentionRequestId.current;
    const candidates = await searchRoomMentionCandidates(createClient(), { conversationId, query, excludeId: currentUser.id });
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

  /**
   * Inserts an emoji into the message text at the current cursor position —
   * a compose-time reaction picker, distinct from MessageReactionBar's
   * react-to-an-already-sent-message picker, but reusing the exact same
   * curated emoji set (MESSAGE_REACTION_EMOJIS) for a consistent "these are
   * this app's reactions" vocabulary rather than a second, unrelated list.
   * Same cursor-preserving pattern as selectMention above.
   */
  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const cursorPos = el?.selectionStart ?? body.length;
    const next = `${body.slice(0, cursorPos)}${emoji}${body.slice(cursorPos)}`;
    setBody(next);
    setEmojiPickerOpen(false);
    const nextCursor = cursorPos + emoji.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    const { kind, limit } = classifyFile(file);
    if (file.size > limit) {
      setError(`That file is too large — up to ${Math.round(limit / (1024 * 1024))}MB.`);
      return;
    }

    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    const previewUrl = kind === "image" ? URL.createObjectURL(file) : null;
    const dimensions = previewUrl ? await readImageDimensions(previewUrl) : null;
    setAttachment({ file, kind, previewUrl, width: dimensions?.width ?? null, height: dimensions?.height ?? null });
  }

  function removeAttachment() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  function resetComposer() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setBody("");
    setAttachment(null);
    setMentionCandidates([]);
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
      parentMessageId: replyTo?.id ?? null,
    });

    if (sendError || !message) {
      setSubmitting(false);
      setError(sendError ?? "Couldn't send your message. Please try again.");
      return;
    }

    let finalMessage = message;

    if (attachment) {
      const { media, error: mediaError } = await attachFileToMessage(supabase, {
        conversationId,
        messageId: message.id,
        uploaderId: currentUser.id,
        file: attachment.file,
        width: attachment.width,
        height: attachment.height,
      });

      if (mediaError) {
        setError("Message sent, but the attachment couldn't be uploaded.");
      } else if (media) {
        finalMessage = { ...message, media };
      }
    }

    // Best-effort, same non-blocking treatment as the attachment above —
    // a mention RLS rejects (not a real room member) never blocks the
    // message, which is already sent.
    const mentionedUsernames = extractMentionedUsernames(trimmedBody);
    if (mentionedUsernames.length > 0) {
      const resolved = await resolveMentionedProfiles(supabase, mentionedUsernames);
      const mentionRefs = resolved.filter((p) => p.id !== currentUser.id);
      if (mentionRefs.length > 0) {
        await createMentions(supabase, { messageId: message.id, mentionedProfileIds: mentionRefs.map((m) => m.id) });
        finalMessage = { ...finalMessage, mentions: mentionRefs };
      }
    }

    setSubmitting(false);
    onSent(finalMessage);
    resetComposer();
    onCancelReply?.();
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-ink/10 p-3">
      {disabled && disabledReason ? (
        <div className="mb-2 rounded-control border border-ink/10 bg-bg-elevated px-3 py-2 text-xs text-text-muted">
          {disabledReason}
        </div>
      ) : null}
      {error ? <FormError message={error} /> : null}

      {replyTo ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-control border-l-2 border-red-primary/50 bg-bg-elevated px-3 py-1.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink">Replying to {replyTo.senderName}</p>
            <p className="truncate text-xs text-text-muted">{replyTo.preview}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {attachment ? (
        <div className="relative mb-2 inline-flex h-16 items-center gap-2 rounded-control bg-bg-elevated px-2">
          {attachment.kind === "image" && attachment.previewUrl ? (
            <div className="relative h-12 w-12 overflow-hidden rounded-control">
              <Image src={attachment.previewUrl} alt="" fill className="object-cover" />
            </div>
          ) : attachment.kind === "video" ? (
            <VideoIcon size={24} />
          ) : (
            <FileGenericIcon size={24} />
          )}
          <span className="max-w-[140px] truncate text-xs text-text-muted">{attachment.file.name}</span>
          <button
            type="button"
            onClick={removeAttachment}
            aria-label="Remove attachment"
            disabled={submitting}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 disabled:opacity-50"
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
          disabled={disabled || submitting || attachment !== null}
          aria-label="Add an attachment"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
        >
          <ImageIcon />
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileSelected} className="sr-only" />

        <button
          type="button"
          onClick={() => setEmojiPickerOpen(true)}
          disabled={disabled || submitting}
          aria-label="Add a reaction emoji"
          aria-expanded={emojiPickerOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
        >
          <EmojiIcon />
        </button>

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => handleBodyChange(e.target.value, e.target.selectionStart)}
            disabled={disabled || submitting}
            rows={1}
            maxLength={MAX_BODY_LENGTH}
            placeholder={disabled ? "You can't post in this room right now" : replyTo ? "Write a reply..." : "Message the room..."}
            aria-label="Message text"
            className="min-h-11 w-full resize-none rounded-control border border-ink/10 bg-bg-elevated px-3 py-2.5 text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (mentionCandidates.length > 0) {
                  selectMention(mentionCandidates[0].username);
                } else {
                  handleSubmit(e);
                }
              } else if (e.key === "Escape" && mentionCandidates.length > 0) {
                setMentionCandidates([]);
              }
            }}
          />
          <MentionAutocomplete candidates={mentionCandidates} onSelect={selectMention} />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-red-primary text-white transition-colors hover:bg-red-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
        >
          <SendIcon />
        </button>
      </div>

      {emojiPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEmojiPickerOpen(false)}
        >
          <div
            role="menu"
            aria-label="Choose an emoji to add to your message"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-ink/10 bg-bg-elevated p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Add a reaction</p>
              <button
                type="button"
                onClick={() => setEmojiPickerOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-ink/10 hover:text-ink"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {MESSAGE_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="menuitem"
                  onClick={() => insertEmoji(emoji)}
                  aria-label={`Add ${emoji}`}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-ink/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
