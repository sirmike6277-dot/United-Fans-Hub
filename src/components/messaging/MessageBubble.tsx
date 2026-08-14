"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/format";
import { getSignedMediaUrl, type MessageReactionSummary } from "@/lib/messaging/messages";
import { FileGenericIcon } from "@/components/community/RoomIcons";
import { ReplyIcon } from "@/components/community/CommunityIcons";
import { MentionText } from "@/components/community/MentionText";
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

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn ? <Avatar url={message.sender.avatar_url} name={senderName} size={32} /> : null}
      <div className={`flex max-w-[75%] flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        {showSenderName && !isOwn ? (
          <span className="px-1 text-xs font-medium text-text-muted">{senderName}</span>
        ) : null}

        {message.deletedAt ? (
          <div className="rounded-card border border-ink/10 bg-bg-elevated px-3 py-2 text-sm italic text-text-muted">
            This message was deleted
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
              {message.body ? (
                <MentionText
                  text={message.body}
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
          </div>
        )}

        {interactive && currentUserId && !message.deletedAt ? (
          <MessageReactionBar messageId={message.id} currentUserId={currentUserId} reactions={reactions} onChange={setReactions} />
        ) : null}

        <time dateTime={message.createdAt} suppressHydrationWarning className="px-1 text-xs text-text-muted">
          {formatRelativeTime(message.createdAt)}
          {message.editedAt ? " · edited" : ""}
        </time>
      </div>
    </div>
  );
}

function MessageAttachment({ media }: { media: NonNullable<FeedMessage["media"]> }) {
  if (media.mediaType === "image") return <MessageImage storagePath={media.storagePath} />;
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

function MessageImage({ storagePath }: { storagePath: string }) {
  const { url, failed } = useSignedUrl(storagePath);

  if (failed) {
    return (
      <div className="mb-1.5 flex h-32 w-48 items-center justify-center rounded-control bg-black/20 text-xs text-text-muted">
        Image unavailable
      </div>
    );
  }
  if (!url) {
    return <div className="mb-1.5 h-32 w-48 animate-pulse rounded-control bg-black/20" aria-hidden="true" />;
  }
  return (
    <div className="relative mb-1.5 h-48 w-64 overflow-hidden rounded-control">
      <Image src={url} alt="" fill sizes="256px" className="object-cover" />
    </div>
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
