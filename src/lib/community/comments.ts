import { createClient } from "@/lib/supabase/client";
import { normalizeMentions, type FeedAuthor, type FeedMention } from "./posts";

/**
 * Comments are loaded per-post on demand (when a user expands a post's
 * comment section), not preloaded for the whole feed — keeps the initial
 * feed fetch light regardless of how many posts have comments. Every
 * comment on the post is fetched in one query (top-level and replies
 * alike) and organized into a two-level tree client-side in
 * normalizeComments — the schema supports deeper nesting
 * (parent_comment_id can point at any comment), but a flat "top-level +
 * its direct replies" shape is what the UI renders.
 */
export const COMMENT_SELECT = `
  id,
  body,
  created_at,
  author_id,
  parent_comment_id,
  author:profiles!comments_author_id_fkey ( id, username, display_name, avatar_url, fan_level, is_current_fan_of_month, is_current_fan_of_season ),
  reactions:comment_reactions ( count ),
  mentions ( mentioned_profile_id, profile:profiles!mentions_mentioned_profile_id_fkey ( username ) )
` as const;

interface MentionRow {
  mentioned_profile_id: string;
  profile: { username: string } | null;
}

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  parent_comment_id: string | null;
  author: FeedAuthor | null;
  reactions: { count: number }[] | null;
  mentions: MentionRow[] | null;
}

export interface FeedComment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  author: FeedAuthor;
  parentCommentId: string | null;
  reactionCount: number;
  hasReacted: boolean;
  mentions: FeedMention[];
  /** Direct replies to this comment, oldest first. Always [] on a reply itself — this app renders one level of nesting. */
  replies: FeedComment[];
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

function normalizeRow(row: CommentRow, reactedCommentIds: ReadonlySet<string>): FeedComment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorId: row.author_id,
    author: row.author ?? { ...FALLBACK_AUTHOR, id: row.author_id },
    parentCommentId: row.parent_comment_id,
    reactionCount: row.reactions?.[0]?.count ?? 0,
    hasReacted: reactedCommentIds.has(row.id),
    mentions: normalizeMentions(row.mentions),
    replies: [],
  };
}

/** Groups a flat list of top-level comments + replies into top-level comments with their direct replies nested underneath, both levels oldest-first. */
function buildThreads(rows: FeedComment[]): FeedComment[] {
  const topLevel: FeedComment[] = [];
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const row of rows) {
    if (row.parentCommentId && byId.has(row.parentCommentId)) {
      byId.get(row.parentCommentId)!.replies.push(row);
    } else {
      // A reply whose parent didn't come back (e.g. a moderated/removed
      // parent) surfaces as top-level rather than silently vanishing.
      topLevel.push(row);
    }
  }

  return topLevel;
}

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

  const normalized = rows.map((row) => normalizeRow(row, reactedCommentIds));
  return { comments: buildThreads(normalized), error: null };
}
