"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/format";
import { InboxIcon } from "./ModerationIcons";
import {
  fetchReports,
  setReportStatus,
  recordModerationAction,
  REPORT_TARGET_TYPES,
  REPORT_REASON_LABELS,
  type FeedReport,
  type ReportStatus,
  type ReportTargetType,
} from "@/lib/moderation/reports";

export interface ModerationQueueProps {
  currentUserId: string;
}

const STATUS_OPTIONS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

// moderation_actions.target_type's own CHECK constraint (migration 010)
// only allows post/comment/user/message — room/poll/nomination reports can
// still be dismissed (a pure report-status change, no moderation_actions
// row needed for a no-op), but "warn/remove/suspend" from this queue only
// make sense, and are only offered, for the four types that schema
// actually supports. Acting on a room/poll/nomination report beyond
// dismissal means using the Fan Room's own existing moderation tools
// (RoomMembersPanel) instead — a disclosed, intentional scope limit, not
// an oversight.
const ACTIONABLE_TARGET_TYPES: ReportTargetType[] = ["post", "comment", "user", "message"];

function ReportRow({ report, currentUserId, onResolved }: { report: FeedReport; currentUserId: string; onResolved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const reporterName = report.reporter.display_name || report.reporter.username;
  const canAct = ACTIONABLE_TARGET_TYPES.includes(report.targetType);

  async function resolve(status: ReportStatus, actionType?: "content_removed" | "user_warned" | "user_suspended" | "report_dismissed") {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (actionType) {
      const { error: actionError } = await recordModerationAction(supabase, {
        targetType: report.targetType as "post" | "comment" | "user" | "message",
        targetId: report.targetId,
        actionType,
        reason: `Report: ${REPORT_REASON_LABELS[report.reason]}${report.details ? ` — ${report.details}` : ""}`,
        reportId: report.id,
      });
      if (actionError) {
        setBusy(false);
        setError(actionError);
        return;
      }
    }

    const { error: statusError } = await setReportStatus(supabase, { reportId: report.id, status, resolvedBy: currentUserId });
    setBusy(false);
    setConfirmingSuspend(false);
    if (statusError) {
      setError(statusError);
      return;
    }
    onResolved();
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-ink/10 bg-bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="outline">{report.targetType}</Badge>
          <Badge tone="red">{REPORT_REASON_LABELS[report.reason]}</Badge>
          <Badge tone={report.status === "open" ? "outline" : "neutral"}>{report.status.replace("_", " ")}</Badge>
        </div>
        <time dateTime={report.createdAt} suppressHydrationWarning className="text-xs text-text-muted">
          {formatRelativeTime(report.createdAt)}
        </time>
      </div>

      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Avatar url={report.reporter.avatar_url} name={reporterName} size={20} />
        Reported by <span className="text-text-body">{reporterName}</span>
      </div>

      {report.details ? <p className="text-sm text-text-body">{report.details}</p> : null}

      <p className="text-xs text-text-muted">
        Target ID: <span className="font-mono text-text-body">{report.targetId}</span>
        {report.targetType === "user" ? (
          <>
            {" · "}
            <a href={`/profile/${report.targetId}`} target="_blank" rel="noopener noreferrer" className="text-red-primary underline hover:text-red-hover">
              View profile
            </a>
          </>
        ) : null}
      </p>

      {error ? <p className="text-sm text-red-hover">{error}</p> : null}

      {report.status === "open" || report.status === "under_review" ? (
        confirmingSuspend ? (
          <div className="flex flex-col gap-2 rounded-control border border-red-primary/30 bg-red-primary/[0.06] p-3">
            <p className="text-xs text-text-body">
              Suspend this member? This applies the existing Fan Room suspension for the room this content came from, if any — it does not lock their account
              app-wide.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingSuspend(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" size="sm" loading={busy} disabled={busy} onClick={() => resolve("actioned", "user_suspended")}>
                Suspend
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => resolve("dismissed", canAct ? "report_dismissed" : undefined)} disabled={busy}>
              Dismiss
            </Button>
            {canAct ? (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={() => resolve("actioned", "user_warned")} disabled={busy}>
                  Warn member
                </Button>
                {report.targetType !== "user" ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => resolve("actioned", "content_removed")} disabled={busy}>
                    Remove content
                  </Button>
                ) : null}
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmingSuspend(true)} disabled={busy}>
                  Suspend member
                </Button>
              </>
            ) : null}
          </div>
        )
      ) : (
        <p className="border-t border-ink/10 pt-3 text-xs text-text-muted">Resolved {report.resolvedAt ? formatRelativeTime(report.resolvedAt) : ""}</p>
      )}
    </div>
  );
}

/**
 * The moderation queue — gated the same way award_manager/room-moderator
 * actions were: `moderator` or `super_admin` (the page wrapping this
 * component checks that server-side before rendering it at all; RLS on
 * `reports`/`moderation_actions` is the real, unbypassable boundary either
 * way). No reporter identity or report detail is ever exposed to anyone
 * this page wouldn't already be gated for.
 */
export function ModerationQueue({ currentUserId }: ModerationQueueProps) {
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");
  const [typeFilter, setTypeFilter] = useState<ReportTargetType | "all">("all");

  // Pure fetcher — no setState inside (see AwardsHub's identical pattern,
  // Phase 18, for why: this lint config only treats setState as "deferred"
  // when it's lexically inside a .then()/subscription callback, not inside
  // a plain function called bare from an effect body).
  function load(status: ReportStatus | "all") {
    const supabase = createClient();
    return fetchReports(supabase, status === "all" ? {} : { status });
  }

  function applyLoadResult({ reports: loaded, error: loadError }: Awaited<ReturnType<typeof load>>) {
    setLoading(false);
    if (loadError) {
      setError(loadError);
      return;
    }
    setReports(loaded);
  }

  useEffect(() => {
    load(statusFilter).then(applyLoadResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // New reports appear live while this page is open — reports' own RLS
  // ("Reporters and moderators can view reports") already scopes delivery
  // correctly, so an unfiltered subscription here is safe.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("moderation-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
        load(statusFilter).then(applyLoadResult);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = typeFilter === "all" ? reports : reports.filter((r) => r.targetType === typeFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value as ReportStatus | "all");
          }}
          className="w-40"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ReportTargetType | "all")} className="w-40">
          <option value="all">All types</option>
          {REPORT_TARGET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <p className="text-sm text-red-hover">{error}</p>
      ) : loading ? (
        <div className="flex flex-col gap-3" aria-live="polite" aria-label="Loading reports">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-card bg-ink/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<InboxIcon size={28} />} title="No reports" description="Nothing matches this filter right now." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((report) => (
            <ReportRow key={report.id} report={report} currentUserId={currentUserId} onResolved={() => load(statusFilter).then(applyLoadResult)} />
          ))}
        </div>
      )}
    </div>
  );
}
