import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "./posts";

type AnySupabase = SupabaseClient<Database>;

/** Mirrors profiles.username_format (letters/digits/underscore) and username_length (3-24). */
const MENTION_TOKEN = /@([a-zA-Z0-9_]{3,24})/g;

/** Every distinct @username token typed in a post/comment body, original casing preserved (usernames aren't case-normalized), deduped case-insensitively. */
export function extractMentionedUsernames(body: string): string[] {
  const seen = new Map<string, string>();
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const raw = match[1];
    const key = raw.toLowerCase();
    if (!seen.has(key)) seen.set(key, raw);
  }
  return [...seen.values()];
}

/**
 * True while the caret sits inside an in-progress "@word" — used to decide
 * whether to show the mention-suggestions dropdown. Returns the partial
 * username typed so far (possibly ""), or null when the caret isn't in a
 * mention context (e.g. mid-word, or "@" preceded by a non-whitespace
 * character like in an email address).
 */
export function activeMentionQuery(value: string, cursorPos: number): string | null {
  const uptoCursor = value.slice(0, cursorPos);
  const match = /@([a-zA-Z0-9_]{0,24})$/.exec(uptoCursor);
  if (!match) return null;
  const charBeforeAt = uptoCursor[match.index - 1];
  if (match.index > 0 && charBeforeAt && !/\s/.test(charBeforeAt)) return null;
  return match[1];
}

/** Replaces the in-progress "@query" at the caret with "@username " and reports where the caret should land next. */
export function applyMention(
  value: string,
  cursorPos: number,
  username: string,
): { value: string; cursorPos: number } {
  const uptoCursor = value.slice(0, cursorPos);
  const match = /@([a-zA-Z0-9_]{0,24})$/.exec(uptoCursor);
  if (!match) return { value, cursorPos };

  const start = match.index;
  const inserted = `@${username} `;
  const nextValue = value.slice(0, start) + inserted + value.slice(cursorPos);
  return { value: nextValue, cursorPos: start + inserted.length };
}

/** Live suggestions for the mention dropdown while composing. */
export async function searchMentionCandidates(
  supabase: AnySupabase,
  { query, excludeId }: { query: string; excludeId: string },
): Promise<FeedAuthor[]> {
  if (query.length === 0) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fan_level")
    .neq("id", excludeId)
    .ilike("username", `${query}%`)
    .order("username", { ascending: true })
    .limit(5);

  return (data ?? []) as FeedAuthor[];
}

/**
 * Room-scoped counterpart — a Fan Room mention must resolve to a real
 * fellow member (see migration 030's RLS check), so the autocomplete only
 * ever offers people who are actually reachable, rather than any app user.
 * Reuses "Participants can see co-participants" (the caller composing a
 * message is, by definition, already a participant).
 */
export async function searchRoomMentionCandidates(
  supabase: AnySupabase,
  { conversationId, query, excludeId }: { conversationId: string; query: string; excludeId: string },
): Promise<FeedAuthor[]> {
  if (query.length === 0) return [];

  // Filtered client-side rather than via a PostgREST embedded-column filter
  // (`.ilike("profile.username", ...)`) — room member counts are small
  // enough that fetching the roster and matching in JS is simpler and
  // avoids relying on embedded-filter query syntax for something this size.
  const { data } = await supabase
    .from("conversation_participants")
    .select("profile:profiles!conversation_participants_profile_id_fkey ( id, username, display_name, avatar_url, fan_level )")
    .eq("conversation_id", conversationId)
    .neq("profile_id", excludeId);

  const lowerQuery = query.toLowerCase();
  return ((data ?? []) as unknown as { profile: FeedAuthor | null }[])
    .map((r) => r.profile)
    .filter((p): p is FeedAuthor => p !== null && p.username.toLowerCase().startsWith(lowerQuery))
    .slice(0, 5);
}

/**
 * Resolves typed @username tokens to real profile ids. Uses one
 * case-insensitive-exact `ilike` filter per token (safe to inline into an
 * `.or()` string unescaped — extractMentionedUsernames only ever returns
 * tokens matching [a-zA-Z0-9_], the same set the DB's username_format CHECK
 * allows, so none of the characters `.or()` treats as syntax can appear).
 */
export async function resolveMentionedProfiles(
  supabase: AnySupabase,
  usernames: string[],
): Promise<{ id: string; username: string }[]> {
  if (usernames.length === 0) return [];

  const orFilter = usernames.map((username) => `username.ilike.${username}`).join(",");
  const { data } = await supabase.from("profiles").select("id, username").or(orFilter);
  return data ?? [];
}

/**
 * Creates the mentions rows for a just-published post/comment. Best-effort
 * by design, mirroring PostComposer's own image-upload handling: a mention
 * failing to insert must never roll back or block the content itself, which
 * has already been published successfully by the time this runs.
 */
export async function createMentions(
  supabase: AnySupabase,
  {
    postId,
    commentId,
    messageId,
    mentionedProfileIds,
  }: { postId?: string; commentId?: string; messageId?: string; mentionedProfileIds: string[] },
): Promise<void> {
  if (mentionedProfileIds.length === 0) return;

  const rows = mentionedProfileIds.map((mentioned_profile_id) => ({
    post_id: postId ?? null,
    comment_id: commentId ?? null,
    message_id: messageId ?? null,
    mentioned_profile_id,
  }));

  // Best-effort: a mention that RLS rejects (e.g. the target isn't
  // actually a room member — see migration 030) never blocks or rolls
  // back the message itself, which is already sent by the time this runs.
  await supabase.from("mentions").insert(rows);
}
