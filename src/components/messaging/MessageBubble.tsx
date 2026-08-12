"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/format";
import { getSignedMediaUrl } from "@/lib/messaging/messages";
import { FileGenericIcon } from "@/components/community/RoomIcons";
import type { FeedMessage } from "@/lib/messaging/messages";

export interface MessageBubbleProps {
  message: FeedMessage;
  isOwn: boolean;
  /** Only shown for the other party's messages, and only in rooms/group_dm where it's not obvious who's speaking — DMs can omit it since it's always "the other person." */
  showSenderName: boolean;
}

export function MessageBubble({ message, isOwn, showSenderName }: MessageBubbleProps) {
  const senderName = message.sender.display_name || message.sender.username;

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn ? <Avatar url={message.sender.avatar_url} name={senderName} size={32} /> : null}
      <div className={`flex max-w-[75%] flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        {showSenderName && !isOwn ? (
          <span className="px-1 text-xs font-medium text-text-muted">{senderName}</span>
        ) : null}

        {message.deletedAt ? (
          <div className="rounded-card border border-white/10 bg-bg-elevated px-3 py-2 text-sm italic text-text-muted">
            This message was deleted
          </div>
        ) : (
          <div
            className={`rounded-card px-3 py-2 text-sm ${
              isOwn ? "bg-red-primary text-white" : "bg-bg-elevated text-text-body"
            }`}
          >
            {message.media ? <MessageAttachment media={message.media} /> : null}
            {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
          </div>
        )}

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
