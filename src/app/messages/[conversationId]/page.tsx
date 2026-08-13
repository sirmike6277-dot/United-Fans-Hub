import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/messaging/MessageThread";
import { fetchMessagesPage, MESSAGES_PAGE_SIZE } from "@/lib/messaging/messages";
import type { FeedAuthor } from "@/lib/community/posts";

export const metadata: Metadata = {
  title: "Messages — United Fans Hub",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

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

  // RLS scopes this to conversations the user actually participates in —
  // a non-participant (or a nonexistent id) gets null here, not an error,
  // and we don't distinguish the two to the client (no confirming whether a
  // given id merely doesn't exist vs. belongs to someone else).
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, kind, community_rooms ( name )")
    .eq("id", conversationId)
    .single();

  if (!conversation) redirect("/messages");

  const { data: otherRows } = await supabase
    .from("conversation_participants")
    .select("profile:profiles!conversation_participants_profile_id_fkey ( id, username, display_name, avatar_url, fan_level )")
    .eq("conversation_id", conversationId)
    .neq("profile_id", userId);

  const otherParticipants = ((otherRows ?? []) as unknown as { profile: FeedAuthor | null }[])
    .map((r) => r.profile)
    .filter((p): p is FeedAuthor => p !== null);

  const { messages, error } = await fetchMessagesPage(supabase, {
    conversationId,
    from: 0,
    to: MESSAGES_PAGE_SIZE - 1,
    currentUserId: userId,
  });

  return (
    <MessageThread
      conversationId={conversationId}
      conversationKind={conversation.kind}
      roomName={conversation.community_rooms?.name ?? null}
      otherParticipants={otherParticipants}
      currentUser={{
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name || profile.username,
        avatarUrl: profile.avatar_url,
        fanLevel: profile.fan_level,
      }}
      initialMessages={messages}
      initialError={error}
      initialHasMore={messages.length === MESSAGES_PAGE_SIZE}
    />
  );
}
