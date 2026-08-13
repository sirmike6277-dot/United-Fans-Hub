import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedAuthor } from "@/lib/community/posts";

type AnySupabase = SupabaseClient<Database>;

/** Matches reports.target_type's CHECK constraint (migration 010, widened by 039) exactly. */
export const REPORT_TARGET_TYPES = ["post", "comment", "user", "message", "room", "poll", "nomination"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** Matches reports.reason's CHECK constraint (migration 039) exactly. */
export const REPORT_REASONS = ["spam", "harassment", "hate_speech", "impersonation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_speech: "Hate speech",
  impersonation: "Impersonation",
  other: "Other",
};

export type ReportStatus = "open" | "under_review" | "actioned" | "dismissed";

export interface FeedReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: FeedAuthor;
}

const REPORT_SELECT = `
  id, target_type, target_id, reason, details, status, created_at, resolved_at,
  reporter:profiles!reports_reporter_id_fkey ( id, username, display_name, avatar_url, fan_level )
` as const;

interface ReportRow {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  reporter: FeedAuthor | null;
}

const FALLBACK_REPORTER: FeedAuthor = { id: "", username: "unknown", display_name: null, avatar_url: null, fan_level: 1 };

function normalize(row: ReportRow): FeedReport {
  return {
    id: row.id,
    targetType: row.target_type as ReportTargetType,
    targetId: row.target_id,
    reason: row.reason as ReportReason,
    details: row.details,
    status: row.status as ReportStatus,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    reporter: row.reporter ?? FALLBACK_REPORTER,
  };
}

/**
 * Files a report as the current user. `details` is the optional free-text
 * elaboration (reports.details, unchanged from migration 010) — `reason`
 * itself is now a real enum (migration 039), not free text, matching the
 * fixed reason list this phase's brief specifies. A second report of the
 * exact same target by the same reporter is rejected by a real UNIQUE
 * constraint (confirmed with the user), not merely re-shown — the caller
 * gets a clear "already reported" message instead of a raw constraint error.
 */
export async function createReport(
  supabase: AnySupabase,
  {
    reporterId,
    targetType,
    targetId,
    reason,
    details,
  }: { reporterId: string; targetType: ReportTargetType; targetId: string; reason: ReportReason; details: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details?.trim() || null,
  });

  if (error) {
    return { error: error.message.includes("duplicate") ? "You've already reported this." : "Couldn't submit your report. Please try again." };
  }
  return { error: null };
}

/** Moderator/admin only (RLS: "Reporters and moderators can view reports") — the full queue, newest first. */
export async function fetchReports(
  supabase: AnySupabase,
  { status }: { status?: ReportStatus } = {},
): Promise<{ reports: FeedReport[]; error: string | null }> {
  let query = supabase.from("reports").select(REPORT_SELECT).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return { reports: [], error: "Couldn't load reports." };
  return { reports: ((data ?? []) as unknown as ReportRow[]).map(normalize), error: null };
}

/**
 * Moderator/admin only — dismisses a report with no further action, or
 * marks it actioned. This only updates the report's own status; recording
 * *what* was done (warn/remove/suspend) is a separate, explicit call to
 * recordModerationAction() below — a report can be actioned without any
 * moderation_actions row only in the "dismiss" case, which needs none.
 */
export async function setReportStatus(
  supabase: AnySupabase,
  { reportId, status, resolvedBy }: { reportId: string; status: ReportStatus; resolvedBy: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq("id", reportId);
  return { error: error ? "Couldn't update the report." : null };
}

export type ModerationActionType = "content_removed" | "user_warned" | "user_suspended" | "report_dismissed";

/**
 * Calls record_moderation_action() (migration 010, SECURITY DEFINER) — the
 * function itself re-checks moderator/super_admin and writes the audit-log
 * row; this is a thin typed wrapper, not a reimplementation. Reused as-is,
 * not duplicated: this is the same function moderation actions have always
 * gone through, this phase just gives it its first real caller from a
 * report-review flow.
 */
export async function recordModerationAction(
  supabase: AnySupabase,
  {
    targetType,
    targetId,
    actionType,
    reason,
    reportId,
    expiresAt,
  }: {
    targetType: "post" | "comment" | "user" | "message";
    targetId: string;
    actionType: ModerationActionType;
    reason: string;
    reportId?: string | null;
    expiresAt?: string | null;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("record_moderation_action", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_action_type: actionType,
    p_reason: reason,
    p_report_id: reportId ?? undefined,
    p_expires_at: expiresAt ?? undefined,
  });
  return { error: error ? error.message : null };
}
