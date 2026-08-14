import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

// Generous scan cap for deriving "latest message per conversation" previews
// without a denormalized last_message_at column (none exists — not inventing
// one). Fine at expected v1 conversation volumes; see the implementation
// report for the tradeoff.
const RECENT_MESSAGES_SCAN_LIMIT = 200;

export interface ConversationRoom {
  slug: string;
  name: string;
  description: string | null;
  isRegional: boolean;
  region: string | null;
}

export interface ConversationPreviewMessage {
  body: string | null;
  createdAt: string;
  senderId: string;
  deletedAt: string | null;
}

export interface ConversationSummary {
  id: string;
  kind: string;
  createdAt: string;
  createdBy: string;
  room: ConversationRoom | null;
  /** The other participant(s) — used for DM display identity. Empty for a room with no other members loaded, or if the query fails partially. */
  otherParticipants: FeedAuthor[];
  lastMessage: ConversationPreviewMessage | null;
  lastReadAt: string | null;
  unread: boolean;
}

interface ParticipantRow {
  conversation_id: string;
  last_read_at: string | null;
  conversation: {
    id: string;
    kind: string;
    created_at: string;
    created_by: string;
    community_rooms: {
      slug: string;
      name: string;
      description: string | null;
      is_regional: boolean;
      region: string | null;
    } | null;
  } | null;
}

type AnySupabase = SupabaseClient<Database>;

/**
 * Fetches every conversation the current user participates in, with enough
 * data to render a list: room metadata (if any), the other participant's
 * identity (for DM display), and a latest-message preview. Three queries,
 * not N+1 — mirrors the same "main query + small follow-up queries" shape
 * already used in community/posts.ts.
 */
export async function fetchConversations(
  supabase: AnySupabase,
  currentUserId: string,
): Promise<{ conversations: ConversationSummary[]; error: string | null }> {
  const { data: participantRows, error: participantError } = await supabase
    .from("conversation_participants")
    .select(
      `
        conversation_id,
        last_read_at,
        conversation:conversations!conversation_participants_conversation_id_fkey (
          id, kind, created_at, created_by,
          community_rooms ( slug, name, description, is_regional, region )
        )
      `,
    )
    .eq("profile_id", currentUserId);

  if (participantError) {
    return { conversations: [], error: "Couldn't load your conversations. Please try again." };
  }

  const rows = (participantRows ?? []) as unknown as ParticipantRow[];
  const conversationIds = rows.map((r) => r.conversation_id);

  if (conversationIds.length === 0) {
    return { conversations: [], error: null };
  }

  // Other participants (for DM identity) — everyone in these conversations except me.
  const { data: coParticipantRows } = await supabase
    .from("conversation_participants")
    .select(
      "conversation_id, profile:profiles!conversation_participants_profile_id_fkey ( id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season )",
    )
    .in("conversation_id", conversationIds)
    .neq("profile_id", currentUserId);

  const othersByConversation = new Map<string, FeedAuthor[]>();
  for (const row of (coParticipantRows ?? []) as unknown as {
    conversation_id: string;
    profile: FeedAuthor | null;
  }[]) {
    if (!row.profile) continue;
    const list = othersByConversation.get(row.conversation_id) ?? [];
    list.push(row.profile);
    othersByConversation.set(row.conversation_id, list);
  }

  // Latest message per conversation, derived in-memory (no window-function RPC — not inventing one).
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("conversation_id, body, created_at, sender_id, deleted_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(RECENT_MESSAGES_SCAN_LIMIT);

  const latestByConversation = new Map<string, ConversationPreviewMessage>();
  for (const m of recentMessages ?? []) {
    if (!latestByConversation.has(m.conversation_id)) {
      latestByConversation.set(m.conversation_id, {
        body: m.body,
        createdAt: m.created_at,
        senderId: m.sender_id,
        deletedAt: m.deleted_at,
      });
    }
  }

  const summaries = rows
    .filter((r): r is ParticipantRow & { conversation: NonNullable<ParticipantRow["conversation"]> } =>
      r.conversation !== null,
    )
    .map((r): { summary: ConversationSummary; activityAt: string } => {
      const conversation = r.conversation;
      const lastMessage = latestByConversation.get(r.conversation_id) ?? null;
      const room = conversation.community_rooms;
      const unread = lastMessage
        ? !r.last_read_at || new Date(lastMessage.createdAt) > new Date(r.last_read_at)
        : false;

      return {
        activityAt: lastMessage?.createdAt ?? conversation.created_at,
        summary: {
          id: r.conversation_id,
          kind: conversation.kind,
          createdAt: conversation.created_at,
          createdBy: conversation.created_by,
          room: room
            ? {
                slug: room.slug,
                name: room.name,
                description: room.description,
                isRegional: room.is_regional,
                region: room.region,
              }
            : null,
          otherParticipants: othersByConversation.get(r.conversation_id) ?? [],
          lastMessage,
          lastReadAt: r.last_read_at,
          unread,
        },
      };
    })
    .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime())
    .map((entry) => entry.summary);

  return { conversations: summaries, error: null };
}

/** Unread conversation count for the navbar badge — deliberately reuses fetchConversations rather than a second bespoke query, per the "keep it simple" instruction. */
export async function fetchUnreadConversationCount(
  supabase: AnySupabase,
  currentUserId: string,
): Promise<number> {
  const { conversations } = await fetchConversations(supabase, currentUserId);
  return conversations.filter((c) => c.unread).length;
}

/**
 * Creates a new DM between the current user and one other profile. Now
 * wired up from the member directory's Start Message action (Phase 6A).
 *
 * The conversation id is generated here (crypto.randomUUID()) and inserted
 * explicitly, rather than letting the column's gen_random_uuid() default
 * fill it in via `.insert().select().single()`. That original shape
 * compiled to a single `INSERT ... RETURNING id`, and Postgres RLS enforces
 * the table's SELECT policy against a RETURNING row — at that instant no
 * conversation_participants row exists yet (that only happens in the next
 * step below), so "Participants can read their conversations" always
 * evaluated false and the entire insert was rejected, for every caller.
 * Knowing the id up front means no RETURNING is needed at all: insert the
 * conversation, insert both participants (which is what makes the SELECT
 * policy pass afterward), and hand back the id we already generated.
 */
export async function createDirectMessage(
  supabase: AnySupabase,
  { currentUserId, otherProfileId }: { currentUserId: string; otherProfileId: string },
): Promise<{ conversationId: string | null; error: string | null }> {
  // Data-layer guard, not just UI-hiding — also avoids leaving behind an
  // orphaned conversation row: the conversation_participants insert below
  // is a separate statement from the conversation insert (unlike the old
  // single-statement RETURNING shape), so without this check a self-DM
  // attempt would still fail on the (conversation_id, profile_id) primary
  // key, but only after the conversation row had already been created.
  if (currentUserId === otherProfileId) {
    return { conversationId: null, error: "You can't start a conversation with yourself." };
  }

  const conversationId = crypto.randomUUID();

  const { error: conversationError } = await supabase
    .from("conversations")
    .insert({ id: conversationId, kind: "dm", created_by: currentUserId });

  if (conversationError) {
    return { conversationId: null, error: "Couldn't start the conversation. Please try again." };
  }

  // Two sequential single-row inserts, not one multi-row array insert —
  // found live while verifying the Safety Loop phase's block-enforcement
  // policy (migration 040/042): a multi-row INSERT evaluates every row's
  // RLS check against the SAME statement-start snapshot, so the second
  // row's "am I the conversation's creator?" check (is_conversation_creator,
  // itself correct and RLS-bypassing) can't yet see whatever the first
  // row's own insert would otherwise make visible — some policy branches
  // silently evaluate as if the first row didn't exist. Splitting into two
  // statements gives the second insert a fresh snapshot that correctly
  // includes the first row and the conversation itself, matching the exact
  // sequence live-verified to work.
  const { error: creatorParticipantError } = await supabase
    .from("conversation_participants")
    .insert({ conversation_id: conversationId, profile_id: currentUserId });

  if (creatorParticipantError) {
    return { conversationId: null, error: "Couldn't add participants to the conversation." };
  }

  const { error: otherParticipantError } = await supabase
    .from("conversation_participants")
    .insert({ conversation_id: conversationId, profile_id: otherProfileId });

  if (otherParticipantError) {
    return { conversationId: null, error: "Couldn't add participants to the conversation." };
  }

  return { conversationId, error: null };
}

/**
 * Looks for an existing 1:1 DM between the current user and another profile,
 * so Start-Message never creates a duplicate conversation — there's no
 * schema-level uniqueness constraint for DM pairs, so this is an
 * application-level check. Reuses the exact same "read a co-participant's
 * row in a conversation I already belong to" access pattern fetchConversations
 * relies on (RLS: "Participants can see co-participants" via
 * is_conversation_participant), so no new privilege is required.
 */
export async function findExistingDirectMessage(
  supabase: AnySupabase,
  { currentUserId, otherProfileId }: { currentUserId: string; otherProfileId: string },
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data: mine, error: mineError } = await supabase
    .from("conversation_participants")
    .select(
      "conversation_id, conversation:conversations!conversation_participants_conversation_id_fkey ( kind )",
    )
    .eq("profile_id", currentUserId);

  if (mineError) {
    return { conversationId: null, error: "Couldn't check for an existing conversation." };
  }

  const dmConversationIds = ((mine ?? []) as unknown as { conversation_id: string; conversation: { kind: string } | null }[])
    .filter((r) => r.conversation?.kind === "dm")
    .map((r) => r.conversation_id);

  if (dmConversationIds.length === 0) {
    return { conversationId: null, error: null };
  }

  const { data: shared, error: sharedError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", otherProfileId)
    .in("conversation_id", dmConversationIds);

  if (sharedError) {
    return { conversationId: null, error: "Couldn't check for an existing conversation." };
  }

  return { conversationId: shared?.[0]?.conversation_id ?? null, error: null };
}

/** Marks a conversation read up to now for the current user — writes only conversation_participants.last_read_at, own row. */
export async function markConversationRead(
  supabase: AnySupabase,
  { conversationId, currentUserId }: { conversationId: string; currentUserId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", currentUserId);

  return { error: error ? "Couldn't update read status." : null };
}

/**
 * Resolves a conversation id to a real, navigable route — a `message`
 * notification's `subject_id` is a bare conversation_id with no way to
 * tell a DM from a Fan Room apart without this lookup (see the Master
 * Product Completion Phase's notification-navigation fix). `community_rooms`
 * is publicly readable, so this works regardless of the caller's own
 * membership — it only resolves a destination, it never reveals room
 * content itself.
 */
export async function resolveConversationHref(supabase: AnySupabase, conversationId: string): Promise<string> {
  const { data } = await supabase
    .from("community_rooms")
    .select("slug")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  return data ? `/community/rooms/${data.slug}` : `/messages/${conversationId}`;
}
