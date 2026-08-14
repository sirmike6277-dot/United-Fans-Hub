import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppearanceEffect } from "@/components/layout/AppearanceEffect";
import { RoomJoinPreview } from "@/components/community/RoomJoinPreview";
import { RoomChat } from "@/components/community/RoomChat";
import { fetchRoomBySlug, fetchMyActiveBan } from "@/lib/community/rooms";
import { fetchMessagesPage, fetchMessagesAround, MESSAGES_PAGE_SIZE } from "@/lib/messaging/messages";

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
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { roomId: slug } = await params;
  const { message: highlightMessageId } = await searchParams;

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
    const [pageResult, { data: isModerator }, { data: isSuperAdmin }] = await Promise.all([
      fetchMessagesPage(supabase, { conversationId: room.conversationId, from: 0, to: MESSAGES_PAGE_SIZE - 1, currentUserId: userId }),
      supabase.rpc("has_role", { role_key: "moderator" }),
      supabase.rpc("has_role", { role_key: "super_admin" }),
    ]);

    let messages = pageResult.messages;
    const messagesError = pageResult.error;
    let highlightFound = false;
    let usedAnchoredFetch = false;

    // A reply/mention notification's `?message=` deep link (see
    // resolveMessageHref) — if the target isn't already in the live tail's
    // first page, fetch a window anchored on it instead so RoomChat opens
    // directly onto the right part of the conversation. If the message no
    // longer exists or this viewer lost access, fetchMessagesAround returns
    // found:false and the room falls back to its normal live-tail view —
    // never a broken page for a stale/invalid link.
    if (highlightMessageId && !messagesError) {
      if (messages.some((m) => m.id === highlightMessageId)) {
        highlightFound = true;
      } else {
        const anchored = await fetchMessagesAround(supabase, {
          conversationId: room.conversationId,
          messageId: highlightMessageId,
          currentUserId: userId,
        });
        if (anchored.found) {
          messages = anchored.messages;
          highlightFound = true;
          usedAnchoredFetch = true;
        }
      }
    }

    const canModerate = myRole === "admin" || Boolean(isModerator) || Boolean(isSuperAdmin);

    body = currentUser ? (
      <RoomChat
        room={room}
        currentUser={currentUser}
        canModerate={canModerate}
        initialMessages={messages}
        initialError={messagesError}
        initialHasMore={usedAnchoredFetch ? true : messages.length === MESSAGES_PAGE_SIZE}
        initialHighlightMessageId={highlightFound ? highlightMessageId : null}
        initialIsAnchored={usedAnchoredFetch}
      />
    ) : null;
  }

  return (
    <>
      {/* AppShell normally owns this — hand-composed here too, same as
          Navbar/Sidebar below, since this route bypasses AppShell (see this
          file's own doc comment). Without it, this route silently never
          applied a signed-in fan's real theme/reduce-motion/text-size
          preferences at all — a real gap this closes, not decoration. */}
      <AppearanceEffect />
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
