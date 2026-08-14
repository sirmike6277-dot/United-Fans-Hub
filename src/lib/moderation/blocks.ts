import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

type AnySupabase = SupabaseClient<Database>;

const PROFILE_FIELDS = "id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season";

/**
 * Block and Mute are deliberately kept in one file (unlike Report, which is
 * its own concern) — they're structurally identical (a directed pair +
 * created_at, self-action prevented by a DB CHECK constraint, both already
 * existed as user_blocks/user_mutes since migration 010) and are always
 * offered together from the same profile-actions surface. Blocking is
 * "full mutual block" (confirmed with the user): enforced server-side for
 * new DMs (both directions) and new mentions (both directions) — see
 * migration 040 — and, for existing DMs, blocks new messages once either
 * party has blocked the other. Fan Room message-visibility hiding and feed/
 * notification hiding for both block and mute are applied here, client-side
 * after a normal fetch (see fetchHiddenProfileIds' own doc comment for why
 * that's the right layer for this specific piece, not RLS).
 */

export async function createBlock(supabase: AnySupabase, { blockerId, blockedId }: { blockerId: string; blockedId: string }): Promise<{ error: string | null }> {
  if (blockerId === blockedId) return { error: "You can't block yourself." };
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  return { error: error ? (error.message.includes("duplicate") ? null : "Couldn't block this user.") : null };
}

export async function removeBlock(supabase: AnySupabase, { blockerId, blockedId }: { blockerId: string; blockedId: string }): Promise<{ error: string | null }> {
  const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  return { error: error ? "Couldn't unblock this user." : null };
}

export async function createMute(supabase: AnySupabase, { muterId, mutedId }: { muterId: string; mutedId: string }): Promise<{ error: string | null }> {
  if (muterId === mutedId) return { error: "You can't mute yourself." };
  const { error } = await supabase.from("user_mutes").insert({ muter_id: muterId, muted_id: mutedId });
  return { error: error ? (error.message.includes("duplicate") ? null : "Couldn't mute this user.") : null };
}

export async function removeMute(supabase: AnySupabase, { muterId, mutedId }: { muterId: string; mutedId: string }): Promise<{ error: string | null }> {
  const { error } = await supabase.from("user_mutes").delete().eq("muter_id", muterId).eq("muted_id", mutedId);
  return { error: error ? "Couldn't unmute this user." : null };
}

/**
 * Whether currentUserId has blocked otherProfileId, or vice versa — "full
 * mutual block" means either direction should collapse the same UI
 * affordances (hide DM/mention actions, etc). One query: user_blocks'
 * SELECT policy (migration 041) exposes rows where the caller is either
 * party, so both directions resolve from a single read.
 */
export async function fetchBlockStatus(
  supabase: AnySupabase,
  { currentUserId, otherProfileId }: { currentUserId: string; otherProfileId: string },
): Promise<{ iBlockedThem: boolean; theyBlockedMe: boolean }> {
  const { data } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${otherProfileId}),and(blocker_id.eq.${otherProfileId},blocked_id.eq.${currentUserId})`);

  const rows = data ?? [];
  return {
    iBlockedThem: rows.some((r) => r.blocker_id === currentUserId),
    theyBlockedMe: rows.some((r) => r.blocker_id === otherProfileId),
  };
}

export async function fetchMyMuteStatus(
  supabase: AnySupabase,
  { currentUserId, otherProfileId }: { currentUserId: string; otherProfileId: string },
): Promise<boolean> {
  const { data } = await supabase.from("user_mutes").select("muter_id").eq("muter_id", currentUserId).eq("muted_id", otherProfileId).maybeSingle();
  return Boolean(data);
}

export interface BlockedOrMutedEntry {
  profile: FeedAuthor;
  createdAt: string;
}

/** For the Settings "Blocked accounts" list — RLS already scopes this to the caller's own rows ("Users can view their own blocks"). */
export async function fetchMyBlocks(supabase: AnySupabase, currentUserId: string): Promise<{ entries: BlockedOrMutedEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select(`created_at, profile:profiles!user_blocks_blocked_id_fkey ( ${PROFILE_FIELDS} )`)
    .eq("blocker_id", currentUserId)
    .order("created_at", { ascending: false });
  if (error) return { entries: [], error: "Couldn't load your blocked accounts." };
  return {
    entries: ((data ?? []) as unknown as { created_at: string; profile: FeedAuthor | null }[])
      .filter((r) => r.profile)
      .map((r) => ({ profile: r.profile as FeedAuthor, createdAt: r.created_at })),
    error: null,
  };
}

/** For the Settings "Muted accounts" list. */
export async function fetchMyMutes(supabase: AnySupabase, currentUserId: string): Promise<{ entries: BlockedOrMutedEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("user_mutes")
    .select(`created_at, profile:profiles!user_mutes_muted_id_fkey ( ${PROFILE_FIELDS} )`)
    .eq("muter_id", currentUserId)
    .order("created_at", { ascending: false });
  if (error) return { entries: [], error: "Couldn't load your muted accounts." };
  return {
    entries: ((data ?? []) as unknown as { created_at: string; profile: FeedAuthor | null }[])
      .filter((r) => r.profile)
      .map((r) => ({ profile: r.profile as FeedAuthor, createdAt: r.created_at })),
    error: null,
  };
}

/**
 * The set of profile ids to hide from `currentUserId`'s own feeds/
 * notifications/Fan Room views — blocked (both directions, since block is
 * mutual-effect) union muted (one direction only: people the CALLER muted,
 * never people who muted the caller — mute must never affect what the
 * muted person sees, per the brief's own "no restriction on the muted
 * user's" rule).
 *
 * Deliberately a client-side, fetch-then-filter step (used by
 * messages.ts/posts.ts's normalizers), not an RLS SELECT deny, for three
 * concrete reasons: (1) a moderator reviewing a Fan Room during a dispute
 * still needs to see every message, including between two blocked users;
 * (2) a reply's "replying to..." preview needs to resolve even when the
 * replied-to message's author is on the reader's hidden list, or the
 * thread breaks; (3) mute is inherently viewer-specific and was never
 * going to be an RLS concept anyway (RLS answers "can this row exist for
 * this reader at all", not "should the UI render it") — reusing the exact
 * same mechanism for block-hiding keeps one filtering path instead of two.
 */
export async function fetchHiddenProfileIds(supabase: AnySupabase, currentUserId: string): Promise<Set<string>> {
  const [{ data: myBlockRows }, { data: mutedByMe }] = await Promise.all([
    // user_blocks' SELECT policy (migration 041) exposes rows where the
    // caller is EITHER party — one query covers both "who I blocked" and
    // "who blocked me" (the other half "full mutual block" needs for
    // hiding to actually go both ways), with no visibility into blocks
    // between two other people.
    supabase.from("user_blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`),
    supabase.from("user_mutes").select("muted_id").eq("muter_id", currentUserId),
  ]);

  const ids = new Set<string>();
  for (const row of myBlockRows ?? []) {
    ids.add(row.blocker_id === currentUserId ? row.blocked_id : row.blocker_id);
  }
  for (const row of mutedByMe ?? []) ids.add(row.muted_id);
  return ids;
}
