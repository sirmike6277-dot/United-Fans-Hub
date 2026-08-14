import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeMentions, type FeedAuthor, type FeedMention } from "@/lib/community/posts";
import { resolveConversationHref } from "./conversations";

export const MESSAGES_PAGE_SIZE = 25;

/** Fixed set — matches message_reactions.emoji's CHECK constraint (migration expand_message_reaction_emojis) exactly. */
export const MESSAGE_REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "⚽", "😮", "😢", "🙌", "💯", "😡"] as const;
export type MessageReactionEmoji = (typeof MESSAGE_REACTION_EMOJIS)[number];

/**
 * Shared select shape — mirrors community/posts.ts's POST_SELECT and
 * notifications.ts's NOTIFICATION_SELECT pattern. One message_media row per
 * message for v1 (message_media has no order_index column — unlike
 * post_media — so this phase doesn't support multiple attachments per
 * message; not inventing a column to work around that). Reactions are
 * embedded as raw (profile_id, emoji) rows rather than a count aggregate —
 * unlike a single like count, a per-emoji breakdown genuinely needs the
 * individual rows to group by emoji client-side. `parent` is the message
 * being replied to (see migration 029) — kept to a minimal preview shape
 * (sender + body only, no further nesting: this app renders one level of
 * reply, matching comments' own "replies aren't further repliable" rule).
 */
export const MESSAGE_SELECT = `
  id,
  conversation_id,
  sender_id,
  body,
  created_at,
  edited_at,
  deleted_at,
  parent_message_id,
  sender:profiles!messages_sender_id_fkey ( id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season ),
  message_media ( id, storage_path, media_type, duration_seconds ),
  reactions:message_reactions ( profile_id, emoji ),
  mentions ( mentioned_profile_id, profile:profiles!mentions_mentioned_profile_id_fkey ( username ) ),
  parent:parent_message_id ( id, body, deleted_at, sender:profiles!messages_sender_id_fkey ( username, display_name ) )
` as const;
// ^ `parent` is deliberately hinted by column name (parent_message_id), not
// by constraint name (messages_parent_message_id_fkey) — this is the fix
// for the real bug behind "every message send fails": PostgREST's
// relationship resolver can't find a self-referencing foreign key via its
// constraint-name hint (confirmed live: `messages!messages_parent_message_id_fkey`
// → PGRST200 "Could not find a relationship", HTTP 400, on every insert,
// since MESSAGE_SELECT is used on every send regardless of whether the
// message is a reply — a NOTIFY/DDL-triggered schema-cache reload did not
// change this, so it isn't cache staleness, it's the hint syntax itself).
// The column-name hint (`parent_message_id`) resolves the exact same
// relationship correctly — confirmed live via the real REST API, not
// assumed. The FK itself was always real and valid (confirmed via
// pg_constraint); only the constraint-name embed hint was broken for this
// self-join.

interface MessageMediaRow {
  id: string;
  storage_path: string;
  media_type: string;
  duration_seconds: number | null;
}

interface MessageReactionRow {
  profile_id: string;
  emoji: string;
}

interface MentionRow {
  mentioned_profile_id: string;
  profile: { username: string } | null;
}

interface ParentMessageRow {
  id: string;
  body: string | null;
  deleted_at: string | null;
  sender: { username: string; display_name: string | null } | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  parent_message_id: string | null;
  sender: FeedAuthor | null;
  message_media: MessageMediaRow[] | null;
  reactions: MessageReactionRow[] | null;
  mentions: MentionRow[] | null;
  parent: ParentMessageRow | null;
}

export interface FeedMessageMedia {
  id: string;
  storagePath: string;
  mediaType: string;
  durationSeconds: number | null;
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ParentMessagePreview {
  id: string;
  body: string | null;
  deleted: boolean;
  senderName: string;
}

export interface FeedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  parentMessageId: string | null;
  sender: FeedAuthor;
  /** null if the message has no attachment, or exactly one — see MESSAGE_SELECT note. */
  media: FeedMessageMedia | null;
  reactions: MessageReactionSummary[];
  mentions: FeedMention[];
  replyTo: ParentMessagePreview | null;
}

const FALLBACK_SENDER: FeedAuthor = {
  id: "",
  username: "unknown",
  display_name: null,
  avatar_url: null,
  fan_level: 1,
  is_current_fan_of_month: false,
  is_current_fan_of_season: false,
};

function summarizeReactions(rows: MessageReactionRow[] | null, currentUserId: string): MessageReactionSummary[] {
  const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const row of rows ?? []) {
    const entry = byEmoji.get(row.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (row.profile_id === currentUserId) entry.reactedByMe = true;
    byEmoji.set(row.emoji, entry);
  }
  return [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v }));
}

function normalize(row: MessageRow, currentUserId: string): FeedMessage {
  const media = row.message_media?.[0];
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    parentMessageId: row.parent_message_id,
    sender: row.sender ?? { ...FALLBACK_SENDER, id: row.sender_id },
    media: media
      ? {
          id: media.id,
          storagePath: media.storage_path,
          mediaType: media.media_type,
          durationSeconds: media.duration_seconds,
        }
      : null,
    reactions: summarizeReactions(row.reactions, currentUserId),
    mentions: normalizeMentions(row.mentions),
    replyTo: row.parent
      ? {
          id: row.parent.id,
          body: row.parent.body,
          deleted: row.parent.deleted_at !== null,
          senderName: row.parent.sender?.display_name || row.parent.sender?.username || "unknown",
        }
      : null,
  };
}

type AnySupabase = SupabaseClient<Database>;

/**
 * Fetches one page of a conversation's messages. Page 0 = the most recent
 * MESSAGES_PAGE_SIZE messages (fetched newest-first, then reversed to
 * chronological order for display); subsequent pages page further into the
 * past ("Load more" for older history) using plain offset .range(), the
 * same simple approach already used for posts/notifications pagination —
 * no cursor complexity, no Realtime, no infinite scroll.
 */
export async function fetchMessagesPage(
  supabase: AnySupabase,
  { conversationId, from, to, currentUserId }: { conversationId: string; from: number; to: number; currentUserId: string },
): Promise<{ messages: FeedMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    return { messages: [], error: "Couldn't load messages. Please try again." };
  }

  const rows = (data ?? []) as unknown as MessageRow[];
  return { messages: rows.map((r) => normalize(r, currentUserId)).reverse(), error: null };
}

/**
 * Fetches one message fully hydrated (sender + media) by id — used to
 * resolve a Realtime `postgres_changes` INSERT payload (which only carries
 * raw `messages` columns, no joins) into a real FeedMessage. Returns null
 * for a row Realtime announced but this client can no longer read (e.g. it
 * was deleted an instant later) — the caller drops the event, it doesn't
 * surface an error for something this transient.
 */
export async function fetchMessageById(
  supabase: AnySupabase,
  messageId: string,
  currentUserId: string,
): Promise<FeedMessage | null> {
  const { data } = await supabase.from("messages").select(MESSAGE_SELECT).eq("id", messageId).maybeSingle();
  if (!data) return null;
  return normalize(data as unknown as MessageRow, currentUserId);
}

/** Sends a text message, optionally as a reply (parent_message_id — validated server-side against cross-conversation replies by migration 029's trigger). Media-only messages (body: null) are supported by the schema. */
export async function sendMessage(
  supabase: AnySupabase,
  {
    conversationId,
    senderId,
    body,
    parentMessageId,
  }: { conversationId: string; senderId: string; body: string | null; parentMessageId?: string | null },
): Promise<{ message: FeedMessage | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body, parent_message_id: parentMessageId ?? null })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) {
    // The user-facing message is deliberately generic (never leaks a raw
    // Postgres/RLS error string) — this is the diagnosable trail instead,
    // visible in the browser console the moment a real send fails.
    if (error) console.error("sendMessage failed:", error.code, error.message);
    return { message: null, error: "Couldn't send your message. Please try again." };
  }

  return { message: normalize(data as unknown as MessageRow, senderId), error: null };
}

/**
 * Uploads an image and attaches it to an existing message — the message
 * must already exist (create-message-first, then-attach-media, same order
 * as PostComposer), using the private message-media bucket with the
 * existing path convention: {conversation_id}/{uploader_id}/{filename}.
 */
export async function attachImageToMessage(
  supabase: AnySupabase,
  {
    conversationId,
    messageId,
    uploaderId,
    file,
  }: { conversationId: string; messageId: string; uploaderId: string; file: File },
): Promise<{ media: FeedMessageMedia | null; error: string | null }> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${conversationId}/${uploaderId}/${messageId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("message-media").upload(path, file);
  if (uploadError) {
    return { media: null, error: "Couldn't upload the image." };
  }

  const { data, error } = await supabase
    .from("message_media")
    .insert({ message_id: messageId, media_type: "image", storage_path: path })
    .select("id, storage_path, media_type, duration_seconds")
    .single();

  if (error || !data) {
    return { media: null, error: "Image uploaded but couldn't be attached." };
  }

  return {
    media: {
      id: data.id,
      storagePath: data.storage_path,
      mediaType: data.media_type,
      durationSeconds: data.duration_seconds,
    },
    error: null,
  };
}

/** message_media.media_type only allows these four (CHECK constraint) — 'voice' is deliberately never produced here (no recording UI exists; see report). */
function inferMediaType(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

/**
 * Room-chat counterpart to attachImageToMessage — accepts any file type
 * (image, video, or generic file), since Fan Rooms' composer supports all
 * three where DMs' composer (for now) only offers images. Same
 * create-message-first, then-attach-media order, same private
 * message-media bucket and path convention; the bucket itself has no
 * mime-type restriction, and message_media.media_type's CHECK constraint
 * already includes 'video' and 'file' — both genuinely schema-supported,
 * not improvised.
 */
export async function attachFileToMessage(
  supabase: AnySupabase,
  {
    conversationId,
    messageId,
    uploaderId,
    file,
  }: { conversationId: string; messageId: string; uploaderId: string; file: File },
): Promise<{ media: FeedMessageMedia | null; error: string | null }> {
  const mediaType = inferMediaType(file);
  const ext = file.name.split(".").pop() || "bin";
  const path = `${conversationId}/${uploaderId}/${messageId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("message-media").upload(path, file);
  if (uploadError) {
    return { media: null, error: "Couldn't upload the attachment." };
  }

  const { data, error } = await supabase
    .from("message_media")
    .insert({ message_id: messageId, media_type: mediaType, storage_path: path })
    .select("id, storage_path, media_type, duration_seconds")
    .single();

  if (error || !data) {
    return { media: null, error: "Attachment uploaded but couldn't be attached to the message." };
  }

  return {
    media: {
      id: data.id,
      storagePath: data.storage_path,
      mediaType: data.media_type,
      durationSeconds: data.duration_seconds,
    },
    error: null,
  };
}

/**
 * One reaction per user per message (the table's own primary key — see
 * migration 028) — tapping the same emoji you already reacted with removes
 * it; tapping a different one changes it; there is no way to hold two
 * reactions on the same message simultaneously, by construction rather
 * than by convention.
 */
export async function toggleMessageReaction(
  supabase: AnySupabase,
  {
    messageId,
    profileId,
    emoji,
    currentEmoji,
  }: { messageId: string; profileId: string; emoji: MessageReactionEmoji; currentEmoji: string | null },
): Promise<{ error: string | null }> {
  if (currentEmoji === emoji) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("profile_id", profileId);
    return { error: error ? "Couldn't remove your reaction." : null };
  }

  const { error } = await supabase
    .from("message_reactions")
    .upsert({ message_id: messageId, profile_id: profileId, emoji }, { onConflict: "message_id,profile_id" });

  return { error: error ? "Couldn't add your reaction." : null };
}

/**
 * Resolves a private storage path to a temporary signed URL — message-media
 * and voice-messages are both private buckets, so getPublicUrl() would
 * return a URL that 401s. Never use getPublicUrl() for these two buckets.
 */
export async function getSignedMediaUrl(
  supabase: AnySupabase,
  bucket: "message-media" | "voice-messages",
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Resolves a message id (a `reply`/`mention` notification's subject_id
 * when subject_type is "message") to a real destination — one small
 * lookup for the message's conversation_id, then the same room-vs-DM
 * resolution `resolveConversationHref` already does for plain `message`
 * notifications. Returns null if the message can no longer be read (e.g.
 * deleted, or this viewer lost access) rather than a broken link.
 *
 * Phase 17: for a Fan Room destination specifically, appends
 * `?message={messageId}` so the room page can attempt to locate/highlight
 * the exact message a reply/mention was about, instead of just opening the
 * room at the live tail. DMs (`/messages/[conversationId]`) don't get the
 * query param — that route doesn't implement anchor-scrolling, and adding
 * one unused param there isn't worth a second code path.
 */
export async function resolveMessageHref(supabase: AnySupabase, messageId: string): Promise<string | null> {
  const { data } = await supabase.from("messages").select("conversation_id").eq("id", messageId).maybeSingle();
  if (!data) return null;
  const href = await resolveConversationHref(supabase, data.conversation_id);
  return href.startsWith("/community/rooms/") ? `${href}?message=${messageId}` : href;
}

/**
 * Re-fetches just one message's reaction rows — used by RoomChat's Realtime
 * handler for message_reactions changes, where re-running the full
 * MESSAGE_SELECT (sender/media/mentions/parent joins) for a reaction toggle
 * would be needless overfetch. Returns null (rather than an empty array) if
 * the message itself is no longer visible to this viewer, so the caller can
 * tell "no reactions" apart from "can't read this anymore."
 */
export async function fetchMessageReactions(
  supabase: AnySupabase,
  messageId: string,
  currentUserId: string,
): Promise<MessageReactionSummary[] | null> {
  const { data, error } = await supabase
    .from("message_reactions")
    .select("profile_id, emoji")
    .eq("message_id", messageId);
  if (error) return null;
  return summarizeReactions(data as unknown as MessageReactionRow[], currentUserId);
}

/**
 * Fetches a window of messages centered on `messageId` — used to open a
 * Fan Room directly onto a specific message (a reply/mention notification's
 * deep link, or clicking a reply-context preview for a message outside the
 * currently loaded page) rather than always landing on the live tail.
 * Two range queries (strictly-older-than-target, strictly-newer-than-or-
 * equal-to-target — the target message itself is included by the "newer"
 * half's own `.gte`), each capped at half MESSAGES_PAGE_SIZE, combined and
 * left in chronological order. Returns an empty array (not an error) if the
 * target message can no longer be read — the caller opens the room at its
 * normal live tail instead, never a broken/blank view.
 */
export async function fetchMessagesAround(
  supabase: AnySupabase,
  { conversationId, messageId, currentUserId }: { conversationId: string; messageId: string; currentUserId: string },
): Promise<{ messages: FeedMessage[]; found: boolean; error: string | null }> {
  const { data: target } = await supabase.from("messages").select("created_at").eq("id", messageId).maybeSingle();
  if (!target) {
    return { messages: [], found: false, error: null };
  }

  const half = Math.floor(MESSAGES_PAGE_SIZE / 2);
  const [{ data: before, error: beforeError }, { data: after, error: afterError }] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .lt("created_at", target.created_at)
      .order("created_at", { ascending: false })
      .limit(half),
    supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .gte("created_at", target.created_at)
      .order("created_at", { ascending: true })
      .limit(half + 1),
  ]);

  if (beforeError || afterError) {
    return { messages: [], found: false, error: "Couldn't load that part of the conversation." };
  }

  const beforeRows = ((before ?? []) as unknown as MessageRow[]).reverse();
  const afterRows = (after ?? []) as unknown as MessageRow[];
  const combined = [...beforeRows, ...afterRows].map((r) => normalize(r, currentUserId));

  return { messages: combined, found: combined.some((m) => m.id === messageId), error: null };
}
