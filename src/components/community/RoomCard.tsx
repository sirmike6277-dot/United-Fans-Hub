import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { JoinRoomButton } from "./JoinRoomButton";
import { RoomAvatar } from "./RoomVisual";
import type { RoomSummary } from "@/lib/community/rooms";

export interface RoomCardProps {
  room: RoomSummary;
  currentUserId: string;
}

export function RoomCard({ room, currentUserId }: RoomCardProps) {
  return (
    <Card className="!p-4 flex flex-col gap-3 transition-colors hover:border-white/30 sm:!p-5">
      <Link href={`/community/rooms/${room.slug}`} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <RoomAvatar name={room.name} slug={room.slug} />
            <p className="font-display text-base font-semibold text-white">{room.name}</p>
          </div>
          {room.isMember ? (
            <Badge tone="outline" className="!px-1.5 !py-0 shrink-0 text-[10px]">
              Joined
            </Badge>
          ) : null}
        </div>
        {room.description ? <p className="line-clamp-2 text-sm text-text-muted">{room.description}</p> : null}
      </Link>

      <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
        <span className="text-xs text-text-muted">
          {room.memberCount.toLocaleString()} {room.memberCount === 1 ? "member" : "members"}
        </span>
        <JoinRoomButton
          conversationId={room.conversationId}
          currentUserId={currentUserId}
          initialIsMember={room.isMember}
          navigateOnJoinHref={`/community/rooms/${room.slug}`}
        />
      </div>
    </Card>
  );
}
