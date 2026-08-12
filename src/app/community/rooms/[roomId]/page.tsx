import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Sidebar } from "@/components/layout/Sidebar";
import { RoomJoinPreview } from "@/components/community/RoomJoinPreview";
import { RoomChat } from "@/components/community/RoomChat";
import { fetchRoomBySlug, fetchMyActiveBan } from "@/lib/community/rooms";
import { fetchMessagesPage, MESSAGES_PAGE_SIZE } from "@/lib/messaging/messages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await params;
  return { title: `${roomId.replace(/-/g, " ")} — Fan Rooms — United Fans Hub` };
}

/**
 * No <Footer/> here, deliberately — same reasoning as messages/layout.tsx:
 * a fixed-height, internally-scrollable chat surface doesn't have the
 * "scroll to the bottom of the page" shape a footer assumes. AppShell isn't
 * used for the same reason it isn't used by /messages (see its own doc
 * comment) — Navbar + Sidebar are hand-composed instead, matching the exact
 * structure messages/layout.tsx already established for this shape.
 */
export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId: slug } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/login");

  const { room, myRole, error: roomError } = await fetchRoomBySlug(supabase, { slug, currentUserId: userId });

  // A slug that doesn't resolve to a real room — not found, not an error;
  // never render a broken chat shell for it.
  if (!room && !roomError) redirect("/community/rooms");

  const currentUser = profile
    ? {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name || profile.username,
        avatarUrl: profile.avatar_url,
        fanLevel: profile.fan_level,
      }
    : null;

  let body: ReactNode;

  if (!room) {
    body = (
      <main className="flex flex-1 items-center justify-center bg-bg-void px-4 py-24 text-center">
        <p className="text-sm text-text-muted">{roomError}</p>
      </main>
    );
  } else if (!room.isMember) {
    const activeBan = await fetchMyActiveBan(supabase, { conversationId: room.conversationId, currentUserId: userId });
    body = <RoomJoinPreview room={room} currentUserId={userId} activeBan={activeBan} />;
  } else {
    const [{ messages, error: messagesError }, { data: isModerator }, { data: isSuperAdmin }] = await Promise.all([
      fetchMessagesPage(supabase, { conversationId: room.conversationId, from: 0, to: MESSAGES_PAGE_SIZE - 1 }),
      supabase.rpc("has_role", { role_key: "moderator" }),
      supabase.rpc("has_role", { role_key: "super_admin" }),
    ]);

    const canModerate = myRole === "admin" || Boolean(isModerator) || Boolean(isSuperAdmin);

    body = currentUser ? (
      <RoomChat
        room={room}
        currentUser={currentUser}
        canModerate={canModerate}
        initialMessages={messages}
        initialError={messagesError}
        initialHasMore={messages.length === MESSAGES_PAGE_SIZE}
      />
    ) : null;
  }

  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto flex w-full max-w-[1440px] items-start px-4 sm:px-6 lg:px-8">
          <Sidebar />
          <div className="min-w-0 flex-1">{body}</div>
        </div>
      </main>
    </>
  );
}
