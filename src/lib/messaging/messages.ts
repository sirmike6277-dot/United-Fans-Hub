import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

export const MESSAGES_PAGE_SIZE = 25;

/**
 * Shared select shape — mirrors community/posts.ts's POST_SELECT and
 * notifications.ts's NOTIFICATION_SELECT pattern. One message_media row per
 * message for v1 (message_media has no order_index column — unlike
 * post_media — so this phase doesn't support multiple attachments per
 * message; not inventing a column to work around that).
 */
export const MESSAGE_SELECT = `
  id,
  conversation_id,
  sender_id,
  body,
  created_at,
  edited_at,
  deleted_at,
  sender:profiles!messages_sender_id_fkey ( id, username, display_name, avatar_url, fan_level ),
  message_media ( id, storage_path, media_type, duration_seconds )
` as const;

interface MessageMediaRow {
  id: string;
  storage_path: string;
  media_type: string;
  duration_seconds: number | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  sender: FeedAuthor | null;
  message_media: MessageMediaRow[] | null;
}

export interface FeedMessageMedia {
  id: string;
  storagePath: string;
  mediaType: string;
  durationSeconds: number | null;
}

export interface FeedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  sender: FeedAuthor;
  /** null if the message has no attachment, or exactly one — see MESSAGE_SELECT note. */
  media: FeedMessageMedia | null;
}

const FALLBACK_SENDER: FeedAuthor = {
  id: "",
  username: "unknown",
  display_name: null,
  avatar_url: null,
  fan_level: 1,
};

function normalize(row: MessageRow): FeedMessage {
  const media = row.message_media?.[0];
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    sender: row.sender ?? { ...FALLBACK_SENDER, id: row.sender_id },
    media: media
      ? {
          id: media.id,
          storagePath: media.storage_path,
          mediaType: media.media_type,
          durationSeconds: media.duration_seconds,
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
  { conversationId, from, to }: { conversationId: string; from: number; to: number },
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
  return { messages: rows.map(normalize).reverse(), error: null };
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
): Promise<FeedMessage | null> {
  const { data } = await supabase.from("messages").select(MESSAGE_SELECT).eq("id", messageId).maybeSingle();
  if (!data) return null;
  return normalize(data as unknown as MessageRow);
}

/** Sends a text message. Media-only messages (body: null) are supported by the schema but not composed until Step 6/fast-follow. */
export async function sendMessage(
  supabase: AnySupabase,
  { conversationId, senderId, body }: { conversationId: string; senderId: string; body: string | null },
): Promise<{ message: FeedMessage | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) {
    return { message: null, error: "Couldn't send your message. Please try again." };
  }

  return { message: normalize(data as unknown as MessageRow), error: null };
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
