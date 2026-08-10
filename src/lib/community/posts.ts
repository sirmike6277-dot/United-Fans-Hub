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
  created_at,
  author_id,
  author:profiles!posts_author_id_fkey ( id, username, display_name, avatar_url, fan_level ),
  post_media ( id, storage_path, media_type, order_index ),
  reactions:post_reactions ( count ),
  comment_total:comments ( count )
` as const;

export interface FeedAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  fan_level: number;
}

export interface FeedPostMedia {
  id: string;
  storage_path: string;
  media_type: string;
  order_index: number;
}

/** Raw shape PostgREST returns for POST_SELECT (count aggregates come back as a one-element array). */
export interface FeedPostRow {
  id: string;
  body: string | null;
  created_at: string;
  author_id: string;
  author: FeedAuthor | null;
  post_media: FeedPostMedia[] | null;
  reactions: { count: number }[] | null;
  comment_total: { count: number }[] | null;
}

/** Normalized shape the UI actually works with. */
export interface FeedPost {
  id: string;
  body: string | null;
  createdAt: string;
  authorId: string;
  author: FeedAuthor;
  media: FeedPostMedia[];
  reactionCount: number;
  commentCount: number;
  hasReacted: boolean;
}

const FALLBACK_AUTHOR: FeedAuthor = {
  id: "",
  username: "unknown",
  display_name: null,
  avatar_url: null,
  fan_level: 1,
};

function normalizePost(row: FeedPostRow, reactedPostIds: ReadonlySet<string>): FeedPost {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorId: row.author_id,
    author: row.author ?? { ...FALLBACK_AUTHOR, id: row.author_id },
    media: (row.post_media ?? []).slice().sort((a, b) => a.order_index - b.order_index),
    reactionCount: row.reactions?.[0]?.count ?? 0,
    commentCount: row.comment_total?.[0]?.count ?? 0,
    hasReacted: reactedPostIds.has(row.id),
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
  { from, to, currentUserId }: { from: number; to: number; currentUserId: string },
): Promise<{ posts: FeedPost[]; error: string | null }> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "published")
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
