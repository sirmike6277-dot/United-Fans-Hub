import { createClient } from "@/lib/supabase/client";
import type { FeedAuthor } from "./posts";

/**
 * Comments are loaded per-post on demand (when a user expands a post's
 * comment section), not preloaded for the whole feed — keeps the initial
 * feed fetch light regardless of how many posts have comments. No
 * pagination within a single post's comments in this phase (first-level,
 * flat thread only — see PostCard/CommentSection).
 */
export const COMMENT_SELECT = `
  id,
  body,
  created_at,
  author_id,
  parent_comment_id,
  author:profiles!comments_author_id_fkey ( id, username, display_name, avatar_url, fan_level ),
  reactions:comment_reactions ( count )
` as const;

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  parent_comment_id: string | null;
  author: FeedAuthor | null;
  reactions: { count: number }[] | null;
}

export interface FeedComment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  author: FeedAuthor;
  reactionCount: number;
  hasReacted: boolean;
}

const FALLBACK_AUTHOR: FeedAuthor = {
  id: "",
  username: "unknown",
  display_name: null,
  avatar_url: null,
  fan_level: 1,
};

export async function fetchComments(
  postId: string,
  currentUserId: string,
): Promise<{ comments: FeedComment[]; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .eq("status", "published")
    .is("parent_comment_id", null) // first-level only in this phase — schema already supports threads for later
    .order("created_at", { ascending: true });

  if (error) {
    return { comments: [], error: "Couldn't load comments." };
  }

  const rows = (data ?? []) as unknown as CommentRow[];
  const commentIds = rows.map((r) => r.id);

  let reactedCommentIds = new Set<string>();
  if (commentIds.length > 0) {
    const { data: myReactions } = await supabase
      .from("comment_reactions")
      .select("comment_id")
      .eq("user_id", currentUserId)
      .in("comment_id", commentIds);
    reactedCommentIds = new Set((myReactions ?? []).map((r) => r.comment_id));
  }

  const comments = rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorId: row.author_id,
    author: row.author ?? { ...FALLBACK_AUTHOR, id: row.author_id },
    reactionCount: row.reactions?.[0]?.count ?? 0,
    hasReacted: reactedCommentIds.has(row.id),
  }));

  return { comments, error: null };
}
