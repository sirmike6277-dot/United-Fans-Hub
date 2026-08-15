"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, crownFor } from "@/components/ui/Avatar";
import { FanLevelBadge } from "@/components/ui/FanLevelBadge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatRelativeTime } from "@/lib/format";
import { getSignedMediaUrl, getSignedMediaDownloadUrl, updateMessage, deleteMessage, type MessageReactionSummary } from "@/lib/messaging/messages";
import { FileGenericIcon } from "@/components/community/RoomIcons";
import { ReplyIcon, PencilIcon, TrashIcon } from "@/components/community/CommunityIcons";
import { MentionText } from "@/components/community/MentionText";
import { MediaLightbox } from "@/components/community/MediaLightbox";
import { MessageReactionBar } from "./MessageReactionBar";
import { ReportButton } from "@/components/moderation/ReportButton";
import { FlagIcon } from "@/components/moderation/ModerationIcons";
import type { FeedMessage } from "@/lib/messaging/messages";

export interface MessageBubbleProps {
  message: FeedMessage;
  isOwn: boolean;
  /** Only shown for the other party's messages, and only in rooms/group_dm where it's not obvious who's speaking — DMs can omit it since it's always "the other person." */
  showSenderName: boolean;
  /**
   * Reactions and replies are a Fan Rooms feature (see the Master Product
   * Completion Phase brief) — DMs render exactly as before when this is
   * omitted, zero behavior change there. `currentUserId` is only required
   * when this is true.
   */
  interactive?: boolean;
  currentUserId?: string;
  onReply?: (message: FeedMessage) => void;
  /**
   * Fan Rooms only (see RoomChat) — clicking the quoted "replying to..."
   * preview locates/highlights the original message. Omitted for DMs,
   * which have no such jump target to offer.
   */
  onJumpToParent?: (messageId: string) => void;
}

export function MessageBubble({ message, isOwn, showSenderName, interactive = false, currentUserId, onReply, onJumpToParent }: MessageBubbleProps) {
  const senderName = message.sender.display_name || message.sender.username;
  const [reactions, setReactions] = useState<MessageReactionSummary[]>(message.reactions);
  // Local overrides for the three fields editing/deleting can change —
  // seeded from the prop, re-seeded whenever the prop itself changes (e.g.
  // Fan Rooms' realtime UPDATE listener refetching this same message; see
  // RoomChat.tsx). DMs have no such realtime listener yet, so there this
  // is purely the editor's own optimistic view until their next reload —
  // no worse than DMs' existing non-realtime baseline for everything else.
  // Adjusted during render (React's own documented pattern for "reset
  // local state when a prop changes"), not in a useEffect — avoids an
  // extra render + effect round-trip, and this file's lint config flags
  // synchronous setState-in-effect for exactly that reason.
  const [prevMessage, setPrevMessage] = useState(message);
  const [body, setBody] = useState(message.body);
  const [editedAt, setEditedAt] = useState(message.editedAt);
  const [deletedAt, setDeletedAt] = useState(message.deletedAt);
  if (message !== prevMessage) {
    setPrevMessage(message);
    setBody(message.body);
    setEditedAt(message.editedAt);
    setDeletedAt(message.deletedAt);
  }

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(body ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function handleSaveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed === body) {
      setEditing(false);
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const { error } = await updateMessage(createClient(), { messageId: message.id, body: trimmed });
    setSavingEdit(false);
    if (error) {
      setEditError(error);
      return;
    }
    setBody(trimmed);
    setEditedAt(new Date().toISOString());
    setEditing(false);
  }

  async function handleConfirmDelete(): Promise<string | null> {
    const { error } = await deleteMessage(createClient(), {
      messageId: message.id,
      mediaStoragePath: message.media?.storagePath ?? null,
    });
    if (error) return error;
    setDeletedAt(new Date().toISOString());
    return null;
  }

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn ? (
        <Link href={`/profile/${message.sender.id}`} className="shrink-0">
          <Avatar url={message.sender.avatar_url} name={senderName} size={32} crown={crownFor(message.sender)} />
        </Link>
      ) : null}
      <div className={`flex max-w-[75%] flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        {showSenderName && !isOwn ? (
          <div className="flex items-center gap-1.5 px-1">
            <Link href={`/profile/${message.sender.id}`} className="text-xs font-medium text-text-muted hover:underline">
              {senderName}
            </Link>
            <FanLevelBadge level={message.sender.fan_level} />
          </div>
        ) : null}

        {deletedAt ? (
          <div className="rounded-card border border-ink/10 bg-bg-elevated px-3 py-2 text-sm italic text-text-muted">
            This message was deleted
          </div>
        ) : editing ? (
          <div className={`w-64 rounded-card px-3 py-2 text-sm ${isOwn ? "bg-red-primary" : "bg-bg-elevated"}`}>
            {editError ? <p className={`mb-1.5 text-xs ${isOwn ? "text-white" : "text-red-hover"}`}>{editError}</p> : null}
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              disabled={savingEdit}
              rows={2}
              autoFocus
              maxLength={2000}
              className={`w-full resize-none rounded-control border px-2 py-1.5 text-sm outline-none transition-colors ${
                isOwn
                  ? "border-white/30 bg-black/10 text-white placeholder:text-white/60 focus:border-white/60"
                  : "border-ink/10 bg-bg-surface text-ink placeholder:text-text-muted/70 focus:border-red-primary"
              }`}
            />
            <div className="mt-1.5 flex justify-end gap-1.5">
              <Button
                type="button"
                variant={isOwn ? "secondary" : "ghost"}
                size="sm"
                className={isOwn ? "!h-7 !border-white/30 !px-2.5 !text-white" : "!h-7 !px-2.5"}
                disabled={savingEdit}
                onClick={() => {
                  setEditing(false);
                  setEditBody(body ?? "");
                  setEditError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={isOwn ? "secondary" : "primary"}
                size="sm"
                className={isOwn ? "!h-7 !border-white/30 !bg-white/10 !px-2.5 !text-white" : "!h-7 !px-2.5"}
                loading={savingEdit}
                disabled={savingEdit || !editBody.trim()}
                onClick={handleSaveEdit}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <div
              className={`rounded-card px-3 py-2 text-sm ${
                isOwn ? "bg-red-primary text-white" : "bg-bg-elevated text-text-body"
              }`}
            >
              {message.replyTo ? (
                onJumpToParent && !message.replyTo.deleted ? (
                  <button
                    type="button"
                    onClick={() => onJumpToParent(message.replyTo!.id)}
                    aria-label={`Go to ${message.replyTo.senderName}'s original message`}
                    className={`mb-1.5 block w-full rounded-control border-l-2 px-2 py-1 text-left text-xs transition-colors ${
                      isOwn ? "border-white/40 bg-black/10 hover:bg-black/20" : "border-ink/20 bg-black/20 hover:bg-black/30"
                    }`}
                  >
                    <p className={isOwn ? "text-white/80" : "text-text-muted"}>{message.replyTo.senderName}</p>
                    <p className={`truncate ${isOwn ? "text-white/70" : "text-text-muted"}`}>{message.replyTo.body || "Attachment"}</p>
                  </button>
                ) : (
                  <div className={`mb-1.5 rounded-control border-l-2 px-2 py-1 text-xs ${isOwn ? "border-white/40 bg-black/10" : "border-ink/20 bg-black/20"}`}>
                    <p className={isOwn ? "text-white/80" : "text-text-muted"}>{message.replyTo.senderName}</p>
                    <p className={`truncate ${isOwn ? "text-white/70" : "text-text-muted"}`}>
                      {message.replyTo.deleted ? "Message deleted" : message.replyTo.body || "Attachment"}
                    </p>
                  </div>
                )
              ) : null}
              {message.media ? <MessageAttachment media={message.media} /> : null}
              {body ? (
                <MentionText
                  text={body}
                  mentions={message.mentions}
                  className="whitespace-pre-wrap break-words"
                  mentionClassName={isOwn ? "font-semibold text-white underline hover:text-white/80" : undefined}
                />
              ) : null}
            </div>

            {interactive && onReply ? (
              <button
                type="button"
                onClick={() => onReply(message)}
                aria-label="Reply to this message"
                title="Reply"
                className={`absolute top-0 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-text-muted opacity-0 shadow-md transition-opacity hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary group-hover:opacity-100 ${
                  isOwn ? "-left-8" : "-right-8"
                }`}
              >
                <ReplyIcon />
              </button>
            ) : null}

            {/* Reporting your own message makes no sense; available in both
                DMs and Fan Rooms alike (not gated behind `interactive`,
                which only controls the Fan-Rooms-only reactions/replies). */}
            {!isOwn && currentUserId ? (
              <ReportButton
                targetType="message"
                targetId={message.id}
                currentUserId={currentUserId}
                ariaLabel="Report this message"
                className={`absolute top-0 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-text-muted opacity-0 shadow-md transition-opacity hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary group-hover:opacity-100 ${
                  interactive && onReply ? "-right-16" : "-right-8"
                }`}
              >
                <FlagIcon />
              </ReportButton>
            ) : null}

            {/* Edit/Delete — own messages only, same hover-reveal treatment
                as Reply/Report, stacked further out on the left (Reply's
                side for an own message) so the two never overlap. */}
            {isOwn && body ? (
              <button
                type="button"
                onClick={() => {
                  setEditBody(body ?? "");
                  setEditing(true);
                }}
                aria-label="Edit this message"
                title="Edit"
                className={`absolute top-0 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-text-muted opacity-0 shadow-md transition-opacity hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary group-hover:opacity-100 ${
                  interactive && onReply ? "-left-16" : "-left-8"
                }`}
              >
                <PencilIcon />
              </button>
            ) : null}
            {isOwn ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label="Delete this message"
                title="Delete"
                className={`absolute top-0 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-text-muted opacity-0 shadow-md transition-opacity hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary group-hover:opacity-100 ${
                  interactive && onReply ? (body ? "-left-24" : "-left-16") : body ? "-left-16" : "-left-8"
                }`}
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
        )}

        {interactive && currentUserId && !deletedAt ? (
          <MessageReactionBar messageId={message.id} currentUserId={currentUserId} reactions={reactions} onChange={setReactions} />
        ) : null}

        <time dateTime={message.createdAt} suppressHydrationWarning className="px-1 text-xs text-text-muted">
          {formatRelativeTime(message.createdAt)}
          {editedAt ? " · edited" : ""}
        </time>
      </div>

      {confirmDeleteOpen ? (
        <ConfirmDialog
          title="Delete message?"
          message="This removes the message and any attached photo or video for everyone in this conversation. This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmDeleteOpen(false)}
        />
      ) : null}
    </div>
  );
}

function MessageAttachment({ media }: { media: NonNullable<FeedMessage["media"]> }) {
  if (media.mediaType === "image") return <MessageImage media={media} />;
  if (media.mediaType === "video") return <MessageVideo storagePath={media.storagePath} />;
  return <MessageFile storagePath={media.storagePath} />;
}

function useSignedUrl(storagePath: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    getSignedMediaUrl(supabase, "message-media", storagePath).then((signedUrl) => {
      if (!active) return;
      if (signedUrl) setUrl(signedUrl);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [storagePath]);

  return { url, failed };
}

/**
 * Hard caps for a message image's box — same "container matches the
 * image, not the other way around" principle as PostMedia.tsx's
 * SingleImageTile, but computed differently: PostMedia's post card has a
 * definite width to size a percentage against (`min(100%, …px)`); a chat
 * bubble doesn't — it shrink-wraps to its own content, so that same
 * `width: min(100%, …)` has no percentage basis to resolve against and
 * silently collapses to 0×0 (confirmed live: every message image button
 * measured 0×0 and Playwright couldn't even click it). Both final pixel
 * dimensions are computed here in JS instead, so the box is never
 * ambiguous regardless of what the bubble around it does.
 */
const MESSAGE_IMAGE_MAX_HEIGHT = 320;
const MESSAGE_IMAGE_MAX_WIDTH = 280;
/** Only used for the handful of legacy rows uploaded before migration 055 added message_media.width/height — same rationale as PostMedia's own FALLBACK_RATIO. */
const MESSAGE_IMAGE_FALLBACK_RATIO = 16 / 9;

function MessageImage({ media }: { media: NonNullable<FeedMessage["media"]> }) {
  const { url, failed } = useSignedUrl(media.storagePath);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [detectedRatio, setDetectedRatio] = useState<number | null>(null);
  const knownRatio = media.width && media.height ? media.width / media.height : null;
  // Same reasoning as PostMedia's SingleImageTile: for the rare legacy row
  // with no stored width/height, MESSAGE_IMAGE_FALLBACK_RATIO is only ever
  // the *first* paint — onLoad below corrects the box to the image's real
  // shape once the browser has it, rather than leaving a permanently
  // wrong-shaped box for anything that isn't actually 16:9.
  const ratio = knownRatio ?? detectedRatio ?? MESSAGE_IMAGE_FALLBACK_RATIO;
  const boxWidth = Math.min(MESSAGE_IMAGE_MAX_WIDTH, MESSAGE_IMAGE_MAX_HEIGHT * ratio);
  const boxHeight = boxWidth / ratio;

  function handleLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    if (knownRatio) return;
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setDetectedRatio(img.naturalWidth / img.naturalHeight);
    }
  }

  function openLightbox() {
    setLightboxOpen(true);
    if (!downloadUrl) {
      getSignedMediaDownloadUrl(createClient(), "message-media", media.storagePath).then(setDownloadUrl);
    }
  }

  if (failed) {
    return (
      <div className="mb-1.5 flex h-32 w-48 items-center justify-center rounded-control bg-bg-elevated text-xs text-text-muted">
        Image unavailable
      </div>
    );
  }
  if (!url) {
    return <div className="mb-1.5 h-32 w-48 animate-pulse rounded-control bg-bg-elevated" aria-hidden="true" />;
  }
  return (
    <>
      <button
        type="button"
        onClick={openLightbox}
        aria-label="View image full-screen"
        className="relative mb-1.5 block cursor-zoom-in bg-bg-elevated"
        style={{ width: boxWidth, height: boxHeight }}
      >
        <Image src={url} alt="" fill sizes="280px" className="rounded-control object-contain" onLoad={handleLoad} />
      </button>
      {lightboxOpen ? (
        <MediaLightbox
          images={[{ url, downloadUrl: downloadUrl ?? url, alt: "" }]}
          index={0}
          onIndexChange={() => {}}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}

function MessageVideo({ storagePath }: { storagePath: string }) {
  const { url, failed } = useSignedUrl(storagePath);

  if (failed) {
    return (
      <div className="mb-1.5 flex h-32 w-48 items-center justify-center rounded-control bg-black/20 text-xs text-text-muted">
        Video unavailable
      </div>
    );
  }
  if (!url) {
    return <div className="mb-1.5 h-32 w-48 animate-pulse rounded-control bg-black/20" aria-hidden="true" />;
  }
  return <video src={url} controls className="mb-1.5 h-48 w-64 rounded-control bg-black object-contain" />;
}

function MessageFile({ storagePath }: { storagePath: string }) {
  const { url, failed } = useSignedUrl(storagePath);
  const filename = storagePath.split("/").pop() ?? "attachment";

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!url || failed}
      onClick={(e) => {
        if (!url || failed) e.preventDefault();
      }}
      className="mb-1.5 flex max-w-[220px] items-center gap-2 rounded-control bg-black/20 px-3 py-2 text-xs transition-colors hover:bg-black/30"
    >
      <FileGenericIcon size={18} />
      <span className="truncate">{failed ? "File unavailable" : url ? filename : "Loading..."}</span>
    </a>
  );
}
