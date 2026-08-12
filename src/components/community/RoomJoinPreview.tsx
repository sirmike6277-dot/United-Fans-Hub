import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JoinRoomButton } from "./JoinRoomButton";
import { RoomAvatar } from "./RoomVisual";
import { BackIcon } from "@/components/messaging/MessagingIcons";
import type { RoomSummary } from "@/lib/community/rooms";

export interface RoomJoinPreviewProps {
  room: RoomSummary;
  currentUserId: string;
  activeBan: { bannedUntil: string | null; reason: string | null } | null;
}

/**
 * Shown instead of the chat itself when the current user hasn't joined yet
 * (or can't) — never attempts to render messages for a non-member, which
 * RLS would reject anyway; this avoids surfacing that as a raw error.
 */
export function RoomJoinPreview({ room, currentUserId, activeBan }: RoomJoinPreviewProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg-void px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <Link
          href="/community/rooms"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-white"
        >
          <BackIcon size={14} />
          All Fan Rooms
        </Link>
        <div className="flex justify-center">
          <RoomAvatar name={room.name} slug={room.slug} size={56} />
        </div>
        <p className="mt-3 font-display text-xl font-bold text-white">{room.name}</p>
        {room.description ? <p className="mt-2 text-sm text-text-muted">{room.description}</p> : null}
        <p className="mt-3 text-xs text-text-muted">
          {room.memberCount.toLocaleString()} {room.memberCount === 1 ? "member" : "members"}
        </p>

        {activeBan ? (
          <div className="mt-5 rounded-control border border-red-primary/30 bg-red-primary/[0.06] p-3 text-sm text-text-body">
            You&apos;ve been suspended from this room
            {activeBan.bannedUntil
              ? ` until ${new Date(activeBan.bannedUntil).toLocaleDateString()}.`
              : " indefinitely."}
          </div>
        ) : (
          <div className="mt-5 flex justify-center">
            <JoinRoomButton conversationId={room.conversationId} currentUserId={currentUserId} initialIsMember={false} size="md" />
          </div>
        )}

        <div className="mt-4">
          <Button href="/community/rooms" variant="ghost" size="sm">
            Back to Fan Rooms
          </Button>
        </div>
      </Card>
    </div>
  );
}
