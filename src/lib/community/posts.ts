import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const POSTS_PAGE_SIZE = 10;

/**
 * Shared select shape for the feed — used by both the server-rendered first
 * page and the client-side "Load more" fetches, so the two never drift.
 * Author identity is joined live from `profiles` (never duplicated onto the
 * post row); reaction/comment totals come back as PostgREST count
 * aggregates rather than fetching every child row.
 */
export const POST_SELECT = `
  id,
  body,
  category,
  created_at,
  author_id,
  author:profiles!posts_author_id_fkey ( id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season ),
  post_media ( id, storage_path, media_type, order_index, width, height ),
  reactions:post_reactions ( count ),
  comment_total:comments ( count ),
  mentions ( mentioned_profile_id, profile:profiles!mentions_mentioned_profile_id_fkey ( username ) )
` as const;

/** Matches the `posts.category` check constraint (migration: add_post_category). */
export const POST_CATEGORIES = ["matchday", "transfers", "general"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export interface FeedAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  fan_level: number;
  /** The current reigning Fan of the Month/Season, if either — never both true and neither ever true for more than one profile at once (see determine_award_winner(), migration 049). Drives the crown overlay on Avatar wherever this author's identity is shown. */
  is_current_fan_of_month: boolean;
  is_current_fan_of_season: boolean;
}

export interface FeedPostMedia {
  id: string;
  storage_path: string;
  media_type: string;
  order_index: number;
  /** Real pixel dimensions captured at upload (see PostComposer) — null for anything uploaded before migration add_post_media_dimensions, which falls back to a sensible default aspect ratio (see PostMedia.tsx). */
  width: number | null;
  height: number | null;
}

/** A validated @mention embedded in a post/comment body — see MentionText. */
export interface FeedMention {
  id: string;
  username: string;
}

interface MentionRow {
  mentioned_profile_id: string;
  profile: { username: string } | null;
}

/** Raw shape PostgREST returns for POST_SELECT (count aggregates come back as a one-element array). */
export interface FeedPostRow {
  id: string;
  body: string | null;
  category: string;
  created_at: string;
  author_id: string;
  author: FeedAuthor | null;
  post_media: FeedPostMedia[] | null;
  reactions: { count: number }[] | null;
  comment_total: { count: number }[] | null;
  mentions: MentionRow[] | null;
}

/** Normalized shape the UI actually works with. */
export interface FeedPost {
  id: string;
  body: string | null;
  category: string;
  createdAt: string;
  authorId: string;
  author: FeedAuthor;
  media: FeedPostMedia[];
  reactionCount: number;
  commentCount: number;
  hasReacted: boolean;
  mentions: FeedMention[];
}

/** Shared by posts.ts and comments.ts — turns the raw mentions embed into MentionText's plain {id, username} shape, dropping anything whose joined profile failed to resolve. */
export function normalizeMentions(rows: MentionRow[] | null): FeedMention[] {
  return (rows ?? [])
    .filter((row): row is MentionRow & { profile: { username: string } } => Boolean(row.profile))
    .map((row) => ({ id: row.mentioned_profile_id, username: row.profile.username }));
}

const FALLBACK_AUTHOR: FeedAuthor = {
  id: "",
  username: "unknown",
  display_name: null,
  avatar_url: null,
  fan_level: 1,
  is_current_fan_of_month: false,
  is_current_fan_of_season: false,
};

function normalizePost(row: FeedPostRow, reactedPostIds: ReadonlySet<string>): FeedPost {
  return {
    id: row.id,
    body: row.body,
    category: row.category,
    createdAt: row.created_at,
    authorId: row.author_id,
    author: row.author ?? { ...FALLBACK_AUTHOR, id: row.author_id },
    media: (row.post_media ?? []).slice().sort((a, b) => a.order_index - b.order_index),
    reactionCount: row.reactions?.[0]?.count ?? 0,
    commentCount: row.comment_total?.[0]?.count ?? 0,
    hasReacted: reactedPostIds.has(row.id),
    mentions: normalizeMentions(row.mentions),
  };
}

type AnySupabase = SupabaseClient<Database>;

/**
 * Fetches one page of the feed plus (in a single follow-up query, not one
 * per post) which of those posts the current user has already reacted to.
 * Works with either the server or browser client — both satisfy the same
 * generic Supabase client shape.
 */
export async function fetchFeedPage(
  supabase: AnySupabase,
  {
    from,
    to,
    currentUserId,
    category,
    authorIds,
  }: {
    from: number;
    to: number;
    currentUserId: string;
    /** Restricts to one real category (see POST_CATEGORIES) — omitted shows every category, same as before this filter existed. */
    category?: PostCategory;
    /** Restricts to posts by these authors — used for the feed's "Following" tab. An empty (not omitted) array is a real, intentional "no one" filter, not "show everyone". */
    authorIds?: string[];
  },
): Promise<{ posts: FeedPost[]; error: string | null }> {
  if (authorIds && authorIds.length === 0) {
    return { posts: [], error: null };
  }

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "published");

  if (category) query = query.eq("category", category);
  if (authorIds) query = query.in("author_id", authorIds);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    return { posts: [], error: "Couldn't load the feed. Please try again." };
  }

  const rows = (data ?? []) as unknown as FeedPostRow[];
  const postIds = rows.map((row) => row.id);

  let reactedPostIds = new Set<string>();
  if (postIds.length > 0) {
    const { data: myReactions } = await supabase
      .from("post_reactions")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds);
    reactedPostIds = new Set((myReactions ?? []).map((r) => r.post_id));
  }

  return { posts: rows.map((row) => normalizePost(row, reactedPostIds)), error: null };
}

/** One page of a single profile's own published posts, newest first — powers the Posts tab on /profile and /profile/[profileId]. */
export async function fetchPostsByAuthor(
  supabase: AnySupabase,
  { authorId, from, to, currentUserId }: { authorId: string; from: number; to: number; currentUserId: string },
): Promise<{ posts: FeedPost[]; error: string | null }> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    return { posts: [], error: "Couldn't load these posts. Please try again." };
  }

  const rows = (data ?? []) as unknown as FeedPostRow[];
  const postIds = rows.map((row) => row.id);

  let reactedPostIds = new Set<string>();
  if (postIds.length > 0) {
    const { data: myReactions } = await supabase
      .from("post_reactions")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds);
    reactedPostIds = new Set((myReactions ?? []).map((r) => r.post_id));
  }

  return { posts: rows.map((row) => normalizePost(row, reactedPostIds)), error: null };
}

/** One post by id, for the permalink/detail page (see /community/[postId]) — same shape and reaction-state logic as a feed page, just scoped to a single row. Returns null (not an error) for a missing/unpublished/deleted post — the caller treats that as a 404, not a fetch failure. */
export async function fetchPostById(
  supabase: AnySupabase,
  { postId, currentUserId }: { postId: string; currentUserId: string },
): Promise<{ post: FeedPost | null; error: string | null }> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return { post: null, error: "Couldn't load this post. Please try again." };
  }
  if (!data) {
    return { post: null, error: null };
  }

  const row = data as unknown as FeedPostRow;
  const { data: myReaction } = await supabase
    .from("post_reactions")
    .select("post_id")
    .eq("user_id", currentUserId)
    .eq("post_id", row.id)
    .maybeSingle();

  return { post: normalizePost(row, new Set(myReaction ? [row.id] : [])), error: null };
}

/**
 * Edits a post's own body — text only, not its media (swapping an image is
 * a distinct, bigger feature that wasn't asked for). RLS already scopes
 * this to the author ("Users can update their own posts", migration
 * 004_community_content) — this function doesn't re-check ownership
 * itself, the database is the real boundary. `updated_at` bumps
 * automatically via the existing `on_post_updated` trigger; nothing else
 * to set here.
 */
export async function updatePost(
  supabase: AnySupabase,
  { postId, body }: { postId: string; body: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("posts").update({ body }).eq("id", postId);
  return { error: error ? "Couldn't save your changes. Please try again." : null };
}

/**
 * Deletes a post the caller authored — actually removes any attached media
 * (storage object + post_media row), not just hides it, since "I posted
 * the wrong image" means the image itself should be gone, not merely
 * unlisted. Storage/row cleanup is best-effort and happens before the
 * final soft-delete, which is the one step that actually hides the post
 * from every reader (migration 050 fixed posts' own SELECT policy to
 * check deleted_at, matching post_media's) — if cleanup partially fails,
 * the post still disappears rather than leaving a broken half-deleted
 * post visible.
 */
export async function deletePost(
  supabase: AnySupabase,
  { postId, mediaPaths }: { postId: string; mediaPaths: string[] },
): Promise<{ error: string | null }> {
  if (mediaPaths.length > 0) {
    await supabase.storage.from("post-media").remove(mediaPaths);
    await supabase.from("post_media").delete().eq("post_id", postId);
  }

  const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId);
  return { error: error ? "Couldn't delete this post. Please try again." : null };
}
