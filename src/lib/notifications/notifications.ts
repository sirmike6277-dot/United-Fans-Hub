import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

export const NOTIFICATIONS_PAGE_SIZE = 20;

/**
 * The 13 values notifications.type currently allows (per its CHECK
 * constraint) — kept here as the single source of truth for the UI's
 * per-type display templates. Only the first 6 are actually fed by a
 * trigger today (see notify_on_* in the implementation log); the rest are
 * schema-valid but not yet produced by anything. The UI must handle all of
 * them without crashing — see notificationCopy() below — but this list
 * itself is not invented, it's read directly from the deployed constraint.
 */
export const KNOWN_NOTIFICATION_TYPES = [
  "like",
  "comment",
  "reply",
  "follow",
  "message",
  "mention",
  "prediction_reminder",
  "match_reminder",
  "match_event",
  "award_nomination",
  "voting_open",
  "achievement_unlocked",
  "moderation_action",
] as const;

/**
 * Shared select shape — mirrors community/posts.ts's POST_SELECT pattern.
 * actor_id is a single, well-defined FK to profiles (not a polymorphic
 * join) — safe and explicit. subject_type/subject_id are read as plain
 * values only, never used to construct a dynamic join to whatever table
 * they happen to point at.
 */
export const NOTIFICATION_SELECT = `
  id,
  type,
  subject_type,
  subject_id,
  read_at,
  created_at,
  actor:profiles!notifications_actor_id_fkey ( id, username, display_name, avatar_url, fan_level )
` as const;

interface NotificationRow {
  id: string;
  type: string;
  subject_type: string | null;
  subject_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: FeedAuthor | null;
}

export interface FeedNotification {
  id: string;
  type: string;
  subjectType: string | null;
  subjectId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: FeedAuthor | null;
}

function normalize(row: NotificationRow): FeedNotification {
  return {
    id: row.id,
    type: row.type,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    actor: row.actor,
  };
}

type AnySupabase = SupabaseClient<Database>;

/**
 * Fetches one page of the current user's notifications, newest first.
 * RLS already scopes every row to recipient_id = auth.uid() on its own;
 * the explicit .eq() below matches that intent for clarity/index-use,
 * mirroring the same convention already used for posts.status.
 */
export async function fetchNotificationsPage(
  supabase: AnySupabase,
  { from, to, currentUserId }: { from: number; to: number; currentUserId: string },
): Promise<{ notifications: FeedNotification[]; error: string | null }> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("recipient_id", currentUserId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    return { notifications: [], error: "Couldn't load notifications. Please try again." };
  }

  const rows = (data ?? []) as unknown as NotificationRow[];
  return { notifications: rows.map(normalize), error: null };
}

/** Unread count for the navbar badge. Uses the existing partial index (recipient_id) WHERE read_at IS NULL. */
export async function fetchUnreadCount(
  supabase: AnySupabase,
  currentUserId: string,
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", currentUserId)
    .is("read_at", null);
  return count ?? 0;
}

/**
 * Human-readable copy per notification, derived only from the actual
 * type/subject_type values — no invented content, no fetching of the
 * target post/comment body (that would require the generic polymorphic
 * join this phase explicitly avoids). Falls back to a humanized version of
 * the raw type string for the 7 declared-but-not-yet-fed types, so the UI
 * never breaks if one of those starts appearing later.
 */
export function notificationCopy(n: FeedNotification): string {
  const name = n.actor ? n.actor.display_name || n.actor.username : "Someone";

  switch (n.type) {
    case "like":
      return n.subjectType === "comment" ? `${name} liked your comment` : `${name} liked your post`;
    case "comment":
      return `${name} commented on your post`;
    case "reply":
      return n.subjectType === "message" ? `${name} replied to your message` : `${name} replied to your comment`;
    case "mention":
      if (n.subjectType === "message") return `${name} mentioned you in a Fan Room`;
      return n.subjectType === "comment" ? `${name} mentioned you in a comment` : `${name} mentioned you in a post`;
    case "follow":
      return `${name} started following you`;
    case "message":
      return `${name} sent you a message`;
    case "moderation_action":
      // Deliberately generic — record_moderation_action() (and this
      // notification) is shared across post/comment/user moderation, and
      // the notification row itself carries no reason/room context to
      // report more specifically without fabricating it.
      return `${name} took a moderation action on your account`;
    default:
      return n.type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  }
}

/** Where clicking the notification navigates — a real, already-existing route in every case, never a fabricated deep link. */
export function notificationHref(n: FeedNotification): string | null {
  if (n.type === "follow") {
    return n.actor ? `/profile/${n.actor.id}` : null;
  }
  if (n.type === "like" || n.type === "comment" || n.type === "reply" || n.type === "mention") {
    return "/community";
  }
  return null;
}
