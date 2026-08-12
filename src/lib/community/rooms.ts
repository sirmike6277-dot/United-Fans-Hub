import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "./posts";

type AnySupabase = SupabaseClient<Database>;

export interface RoomSummary {
  conversationId: string;
  slug: string;
  name: string;
  description: string | null;
  isRegional: boolean;
  region: string | null;
  createdAt: string;
  memberCount: number;
  isMember: boolean;
}

export interface RoomMember {
  profileId: string;
  role: string;
  joinedAt: string;
  profile: FeedAuthor;
}

export interface RoomBan {
  profileId: string;
  bannedAt: string;
  bannedUntil: string | null;
  reason: string | null;
  profile: FeedAuthor;
}

interface CommunityRoomRow {
  conversation_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_regional: boolean;
  region: string | null;
  conversation: { created_at: string } | null;
}

/**
 * Room discovery list. `community_rooms` is publicly readable by design
 * (that's the whole point of discovery), but member counts and "am I a
 * member" both need per-room follow-up reads: counts via room_member_count()
 * (SECURITY DEFINER — see migration 024, works even before joining), and
 * membership via a plain self-scoped conversation_participants query (safe
 * regardless of membership — see the phase's implementation notes: if you're
 * not a participant there's simply no row to find, RLS doesn't need to
 * "hide" a row that doesn't exist).
 */
export async function fetchRooms(
  supabase: AnySupabase,
  currentUserId: string,
): Promise<{ rooms: RoomSummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("community_rooms")
    .select(
      "conversation_id, slug, name, description, is_regional, region, conversation:conversations!community_rooms_conversation_id_fkey ( created_at )",
    )
    .order("name", { ascending: true });

  if (error) {
    return { rooms: [], error: "Couldn't load Fan Rooms. Please try again." };
  }

  const rows = (data ?? []) as unknown as CommunityRoomRow[];
  if (rows.length === 0) return { rooms: [], error: null };

  const conversationIds = rows.map((r) => r.conversation_id);

  const [memberCounts, myMemberships] = await Promise.all([
    Promise.all(
      conversationIds.map((id) =>
        supabase.rpc("room_member_count", { p_conversation_id: id }).then(({ data: count }) => [id, count ?? 0] as const),
      ),
    ),
    supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("profile_id", currentUserId)
      .in("conversation_id", conversationIds),
  ]);

  const countById = new Map(memberCounts);
  const memberSet = new Set((myMemberships.data ?? []).map((r) => r.conversation_id));

  const rooms = rows.map((row) => ({
    conversationId: row.conversation_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isRegional: row.is_regional,
    region: row.region,
    createdAt: row.conversation?.created_at ?? new Date(0).toISOString(),
    memberCount: Number(countById.get(row.conversation_id) ?? 0),
    isMember: memberSet.has(row.conversation_id),
  }));

  return { rooms, error: null };
}

/** A single room's detail, resolved by its public slug (the /community/rooms/[roomId] param). */
export async function fetchRoomBySlug(
  supabase: AnySupabase,
  { slug, currentUserId }: { slug: string; currentUserId: string },
): Promise<{ room: RoomSummary | null; myRole: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("community_rooms")
    .select(
      "conversation_id, slug, name, description, is_regional, region, conversation:conversations!community_rooms_conversation_id_fkey ( created_at )",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return { room: null, myRole: null, error: "Couldn't load this room. Please try again." };
  }
  if (!data) {
    return { room: null, myRole: null, error: null };
  }

  const row = data as unknown as CommunityRoomRow;

  const [{ data: count }, { data: myRow }] = await Promise.all([
    supabase.rpc("room_member_count", { p_conversation_id: row.conversation_id }),
    supabase
      .from("conversation_participants")
      .select("role")
      .eq("conversation_id", row.conversation_id)
      .eq("profile_id", currentUserId)
      .maybeSingle(),
  ]);

  return {
    room: {
      conversationId: row.conversation_id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      isRegional: row.is_regional,
      region: row.region,
      createdAt: row.conversation?.created_at ?? new Date(0).toISOString(),
      memberCount: Number(count ?? 0),
      isMember: Boolean(myRow),
    },
    myRole: myRow?.role ?? null,
    error: null,
  };
}

/** Active ban (if any) for the current user in a room — used to show "You're suspended from this room" instead of a raw RLS failure on join. */
export async function fetchMyActiveBan(
  supabase: AnySupabase,
  { conversationId, currentUserId }: { conversationId: string; currentUserId: string },
): Promise<{ bannedUntil: string | null; reason: string | null } | null> {
  const { data } = await supabase
    .from("room_bans")
    .select("banned_until, reason")
    .eq("conversation_id", conversationId)
    .eq("profile_id", currentUserId)
    .maybeSingle();

  if (!data) return null;
  if (data.banned_until && new Date(data.banned_until) <= new Date()) return null; // expired
  return { bannedUntil: data.banned_until, reason: data.reason };
}

export async function joinRoom(
  supabase: AnySupabase,
  { conversationId, currentUserId }: { conversationId: string; currentUserId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("conversation_participants")
    .insert({ conversation_id: conversationId, profile_id: currentUserId, role: "member" });

  if (error) {
    if (error.code === "23505") return { error: null }; // already a member — idempotent
    return { error: "Couldn't join this room right now. Please try again." };
  }
  return { error: null };
}

export async function leaveRoom(
  supabase: AnySupabase,
  { conversationId, currentUserId }: { conversationId: string; currentUserId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("profile_id", currentUserId);

  return { error: error ? "Couldn't leave this room. Please try again." : null };
}

/**
 * Generates a URL-safe slug candidate from a room name — kebab-cased,
 * ASCII-only. Uniqueness is enforced by the database (`community_rooms.slug`
 * is UNIQUE); createRoom surfaces that as a friendly "name already taken"
 * message rather than a raw constraint error.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "room";
}

/**
 * Creates a new room. RLS (`conversations` INSERT policy) already restricts
 * kind='community_room' to has_role('moderator') — this is the enforcement
 * boundary, not the `canModerate` prop gating the UI button. The creator is
 * auto-joined as the room's first admin participant, mirroring how
 * createDirectMessage() always seats its own creator as a participant.
 */
export async function createRoom(
  supabase: AnySupabase,
  { name, description, createdBy }: { name: string; description: string | null; createdBy: string },
): Promise<{ slug: string | null; error: string | null }> {
  const slug = slugify(name);

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({ kind: "community_room", created_by: createdBy })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    return { slug: null, error: "Couldn't create the room. You may need moderator permissions." };
  }

  const { error: roomError } = await supabase
    .from("community_rooms")
    .insert({ conversation_id: conversation.id, slug, name, description });

  if (roomError) {
    return {
      slug: null,
      error: roomError.code === "23505" ? "A room with that name already exists." : "Couldn't create the room.",
    };
  }

  const { error: participantError } = await supabase
    .from("conversation_participants")
    .insert({ conversation_id: conversation.id, profile_id: createdBy, role: "admin" });

  if (participantError) {
    return { slug, error: "Room created, but couldn't add you as its admin." };
  }

  return { slug, error: null };
}

/** Room member list — only resolvable for someone who is already a participant (RLS: "Participants can see co-participants"). */
export async function fetchRoomMembers(
  supabase: AnySupabase,
  conversationId: string,
): Promise<{ members: RoomMember[]; error: string | null }> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select(
      "profile_id, role, joined_at, profile:profiles!conversation_participants_profile_id_fkey ( id, username, display_name, avatar_url, fan_level )",
    )
    .eq("conversation_id", conversationId)
    .order("joined_at", { ascending: true });

  if (error) {
    return { members: [], error: "Couldn't load room members." };
  }

  const rows = (data ?? []) as unknown as {
    profile_id: string;
    role: string;
    joined_at: string;
    profile: FeedAuthor | null;
  }[];

  return {
    members: rows
      .filter((r): r is typeof r & { profile: FeedAuthor } => r.profile !== null)
      .map((r) => ({ profileId: r.profile_id, role: r.role, joinedAt: r.joined_at, profile: r.profile })),
    error: null,
  };
}

/** Removes a member without a timed suspension — they could self-rejoin immediately (rooms are open-join). Pair with banMember for an actual suspension. */
export async function kickMember(
  supabase: AnySupabase,
  { conversationId, targetProfileId }: { conversationId: string; targetProfileId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("profile_id", targetProfileId);

  return { error: error ? "Couldn't remove this member." : null };
}

export async function banMember(
  supabase: AnySupabase,
  {
    conversationId,
    targetProfileId,
    bannedBy,
    bannedUntil,
    reason,
  }: { conversationId: string; targetProfileId: string; bannedBy: string; bannedUntil: string | null; reason: string | null },
): Promise<{ error: string | null }> {
  // Remove them now (if currently a member) — the ban row is what stops the self-rejoin.
  await supabase.from("conversation_participants").delete().eq("conversation_id", conversationId).eq("profile_id", targetProfileId);

  const { error } = await supabase.from("room_bans").insert({
    conversation_id: conversationId,
    profile_id: targetProfileId,
    banned_by: bannedBy,
    banned_until: bannedUntil,
    reason,
  });

  // Best-effort: logs the action to the existing moderation ledger and
  // notifies the affected user via the existing (previously-declared,
  // never-produced) 'moderation_action' notification type — see migration
  // 026. record_moderation_action() requires a *global* moderator/
  // super_admin role, which a room-level-only admin may not hold; if it
  // rejects the call, the ban above has already succeeded regardless — this
  // secondary step never blocks the primary one.
  if (!error) {
    await supabase.rpc("record_moderation_action", {
      p_target_type: "user",
      p_target_id: targetProfileId,
      p_action_type: bannedUntil ? "user_suspended" : "user_banned",
      p_reason: reason ?? "Removed from a Fan Room for breaching community guidelines.",
    });
  }

  if (error) {
    return { error: error.code === "23505" ? "This fan is already suspended from this room." : "Couldn't suspend this member." };
  }
  return { error: null };
}

export async function unbanMember(
  supabase: AnySupabase,
  { conversationId, targetProfileId }: { conversationId: string; targetProfileId: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("room_bans")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("profile_id", targetProfileId);

  return { error: error ? "Couldn't lift the suspension." : null };
}

export async function fetchRoomBans(
  supabase: AnySupabase,
  conversationId: string,
): Promise<{ bans: RoomBan[]; error: string | null }> {
  const { data, error } = await supabase
    .from("room_bans")
    .select(
      "profile_id, created_at, banned_until, reason, profile:profiles!room_bans_profile_id_fkey ( id, username, display_name, avatar_url, fan_level )",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { bans: [], error: "Couldn't load suspended members." };
  }

  const rows = (data ?? []) as unknown as {
    profile_id: string;
    created_at: string;
    banned_until: string | null;
    reason: string | null;
    profile: FeedAuthor | null;
  }[];

  return {
    bans: rows
      .filter((r): r is typeof r & { profile: FeedAuthor } => r.profile !== null)
      .map((r) => ({ profileId: r.profile_id, bannedAt: r.created_at, bannedUntil: r.banned_until, reason: r.reason, profile: r.profile })),
    error: null,
  };
}
