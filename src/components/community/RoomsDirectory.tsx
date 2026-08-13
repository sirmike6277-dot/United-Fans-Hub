"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon, UsersIcon } from "@/components/members/MembersIcons";
import { RoomCard } from "./RoomCard";
import { CreateRoomDialog } from "./CreateRoomDialog";
import type { RoomSummary } from "@/lib/community/rooms";

export interface RoomsDirectoryProps {
  currentUserId: string;
  rooms: RoomSummary[];
  error: string | null;
  canCreateRoom: boolean;
}

/**
 * Fan Rooms discovery. Unlike Members/Community (server-paginated), the
 * full room list is fetched once server-side and filtered client-side here
 * — legitimate for this data shape: a handful of curated official rooms
 * (moderator-created only), not an open, growing, user-generated list that
 * would need real pagination.
 *
 * The page's own SectionBanner (see community/rooms/page.tsx) now carries
 * the title/subtitle that used to live in a PageHeader here — this only
 * renders the search + (moderator-only) create action beneath it.
 */
export function RoomsDirectory({ currentUserId, rooms, error, canCreateRoom }: RoomsDirectoryProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter(
      (room) => room.name.toLowerCase().includes(term) || (room.description ?? "").toLowerCase().includes(term),
    );
  }, [rooms, query]);

  return (
    <div className="flex flex-col gap-4 pb-6 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          icon={<SearchIcon size={18} />}
          placeholder="Search rooms"
          aria-label="Search Fan Rooms"
          className="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {canCreateRoom ? <CreateRoomDialog currentUserId={currentUserId} /> : null}
      </div>

      {error ? (
        <EmptyState icon={<UsersIcon size={28} />} title="Couldn't load Fan Rooms" description={error} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={28} />}
          title="No Fan Rooms yet"
          description="Check back soon — official rooms for matchday chat, transfer talk, and more are on their way."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon size={28} />} title="No rooms match your search" description="Try a different word." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((room) => (
            <RoomCard key={room.conversationId} room={room} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
